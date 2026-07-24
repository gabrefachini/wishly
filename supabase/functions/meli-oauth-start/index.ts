import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  buildJsonResponse,
  buildMercadoLivreAuthorizeUrl,
  createOauthState,
  getRequiredEnv,
} from "../_shared/meli.ts";

function getSupabaseAnonKey() {
  const directKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (directKey) return directKey;

  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!publishableKeys) return "";

  try {
    const parsed = JSON.parse(publishableKeys) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? "";
  } catch {
    return "";
  }
}

async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "missing_session",
        message: "Sessao ausente. Entre novamente para continuar.",
      }, 401),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "auth_config_unavailable",
        message: "Configuracao de autenticacao indisponivel.",
      }, 500),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authorization.slice("Bearer ".length).trim());

  if (error || !user) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "invalid_session",
        message: "Sessao invalida ou expirada. Entre novamente para continuar.",
      }, 401),
    };
  }

  return { user, response: null };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(request.headers.get("Origin")) });
  }

  if (request.method !== "POST") {
    return buildJsonResponse(request, { error: "method_not_allowed" }, 405);
  }

  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response || !authResult.user) return authResult.response!;

    const body = await request.json().catch(() => ({}));
    const appId = getRequiredEnv("MELI_APP_ID");
    const redirectUri = getRequiredEnv("MELI_REDIRECT_URI");
    const state = await createOauthState({
      userId: authResult.user.id,
      returnTo: typeof body?.returnTo === "string" ? body.returnTo : null,
    });

    return buildJsonResponse(request, {
      authorizationUrl: buildMercadoLivreAuthorizeUrl({
        appId,
        redirectUri,
        state,
      }),
    });
  } catch (error) {
    return buildJsonResponse(request, {
      error: "meli_oauth_start_failed",
      message: error instanceof Error ? error.message : "Nao foi possivel iniciar a conexao com o Mercado Livre.",
    }, 500);
  }
});
