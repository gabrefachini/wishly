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

    const supabase = createServiceRoleClient();
    const expiresAt = new Date(Date.now() + Number(tokenPayload.expires_in ?? 0) * 1000).toISOString();

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

    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "success",
    }));
  } catch (error) {
    console.error("meli_oauth_callback_failed", error);
    return redirect(buildOauthCompletionRedirect({
      returnTo: state.returnTo,
      status: "error",
      code: error instanceof Error ? error.message : "callback_failed",
    }));
  }
});
