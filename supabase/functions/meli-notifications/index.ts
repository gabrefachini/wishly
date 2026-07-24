import {
  buildCorsHeaders,
  buildJsonResponse,
  createServiceRoleClient,
} from "../_shared/meli.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(request.headers.get("Origin")) });
  }

  if (request.method !== "POST") {
    return buildJsonResponse(request, { error: "method_not_allowed" }, 405);
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("meli_notification_events").insert({
      topic: typeof payload?.topic === "string" ? payload.topic : null,
      resource: typeof payload?.resource === "string" ? payload.resource : null,
      user_id: payload?.user_id != null ? String(payload.user_id) : null,
      application_id: payload?.application_id != null ? String(payload.application_id) : null,
      attempts: Number.isFinite(Number(payload?.attempts)) ? Number(payload.attempts) : null,
      payload,
      headers: {
        user_agent: request.headers.get("user-agent"),
        x_request_id: request.headers.get("x-request-id"),
        x_signature: request.headers.get("x-signature"),
      },
    });

    if (error) {
      console.error("meli_notification_insert_failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return buildJsonResponse(request, { ok: false }, 500);
    }

    return buildJsonResponse(request, { ok: true }, 200);
  } catch (error) {
    console.error("meli_notification_failed", error);
    return buildJsonResponse(request, { ok: false }, 500);
  }
});
