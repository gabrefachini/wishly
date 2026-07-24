import {
  buildOauthCompletionRedirect,
  createServiceRoleClient,
  exchangeMercadoLivreCodeForToken,
  getRequiredEnv,
  verifyOauthState,
} from "../_shared/meli.ts";

function redirect(url: string) {
  return Response.redirect(url, 302);
}

async function recordOauthEvent(input: {
  topic: "oauth_success" | "oauth_error";
  authUserId: string;
  payload: Record<string, unknown>;
}) {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("meli_notification_events").insert({
      topic: input.topic,
      resource: input.authUserId,
      payload: input.payload,
      headers: {},
    });
  } catch (error) {
    console.error("meli_oauth_event_record_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  const errorCode = requestUrl.searchParams.get("error");
  const authCode = requestUrl.searchParams.get("code");
  const stateParam = requestUrl.searchParams.get("state");

  let state;
  try {
    state = await verifyOauthState(stateParam);
  } catch (error) {
    const fallback = Deno.env.get("MELI_OAUTH_DEFAULT_RETURN_URL")?.trim() || "https://www.wishlyapp.com.br/";
    const code = error instanceof Error ? error.message : "invalid_state";
    return redirect(buildOauthCompletionRedirect({ returnTo: fallback, status: "error", code }));
  }

  if (errorCode) {
    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "error",
      code: errorCode,
    }));
  }

  if (!authCode) {
    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "error",
      code: "missing_code",
    }));
  }

  try {
    const appId = getRequiredEnv("MELI_APP_ID");
    const clientSecret = getRequiredEnv("MELI_SECRET_KEY");
    const redirectUri = getRequiredEnv("MELI_REDIRECT_URI");
    const tokenPayload = await exchangeMercadoLivreCodeForToken({
      code: authCode,
      appId,
      clientSecret,
      redirectUri,
    });
    if (!tokenPayload.access_token || !tokenPayload.refresh_token || !tokenPayload.user_id) {
      throw new Error("incomplete_token_payload");
    }

    const supabase = createServiceRoleClient();
    const expiresAt = new Date(Date.now() + Number(tokenPayload.expires_in ?? 0) * 1000).toISOString();
    const { data: existingConnection, error: existingConnectionError } = await supabase
      .from("meli_connections")
      .select("is_platform")
      .eq("auth_user_id", state.sub)
      .maybeSingle();
    if (existingConnectionError) {
      throw new Error("existing_connection_lookup_failed");
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(state.sub);
    const authEmail = authUserData?.user?.email?.trim() ?? "";
    if ((authUserError || !authEmail) && !existingConnection?.is_platform) {
      throw new Error("oauth_user_lookup_failed");
    }

    let isPlatformConnection = Boolean(existingConnection?.is_platform);
    if (authEmail) {
      const { data: adminUser, error: adminLookupError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("active", true)
        .ilike("email", authEmail)
        .maybeSingle();
      if (adminLookupError) {
        throw new Error("admin_lookup_failed");
      }
      isPlatformConnection = Boolean(adminUser);
    }

    if (isPlatformConnection) {
      const { error: clearPlatformError } = await supabase
        .from("meli_connections")
        .update({ is_platform: false })
        .eq("is_platform", true)
        .neq("auth_user_id", state.sub);
      if (clearPlatformError) {
        throw new Error("platform_connection_rotation_failed");
      }
    }

    const { error: upsertError } = await supabase.from("meli_connections").upsert({
      auth_user_id: state.sub,
      meli_user_id: String(tokenPayload.user_id),
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      token_type: tokenPayload.token_type,
      scope: tokenPayload.scope,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      revoked_at: null,
      is_platform: isPlatformConnection,
    }, {
      onConflict: "auth_user_id",
    });

    if (upsertError) {
      console.error("meli_oauth_callback_upsert_failed", {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return redirect(buildOauthCompletionRedirect({
        returnTo: state.returnTo,
        status: "error",
        code: "db_upsert_failed",
      }));
    }

    await recordOauthEvent({
      topic: "oauth_success",
      authUserId: state.sub,
      payload: {
        isPlatformConnection,
        meliUserId: String(tokenPayload.user_id),
        hasRefreshToken: Boolean(tokenPayload.refresh_token),
        scope: tokenPayload.scope ?? null,
      },
    });

    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "success",
    }));
  } catch (error) {
    console.error("meli_oauth_callback_failed", error);
    const errorMessage = error instanceof Error ? error.message : "callback_failed";
    await recordOauthEvent({
      topic: "oauth_error",
      authUserId: state.sub,
      payload: {
        error: errorMessage,
      },
    });
    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "error",
      code: errorMessage,
    }));
  }
});
