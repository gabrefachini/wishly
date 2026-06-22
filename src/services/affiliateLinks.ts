import { buildGiftRedirectPath, extractMerchantDomain } from "../lib/affiliate";
import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";

type ResolveGiftRedirectInput = {
  giftId: string;
  shareId: string;
  locale: string;
  userAgent?: string;
  referrer?: string;
};

export const AffiliateLinkService = {
  extractMerchantDomain,
  buildGiftRedirectPath,
};

export async function resolveGiftRedirect(input: ResolveGiftRedirectInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("resolve_public_gift_redirect", {
    p_share_id: input.shareId,
    p_gift_id: input.giftId,
    p_locale: input.locale,
    p_user_agent: input.userAgent || null,
    p_referrer: input.referrer || null,
  });

  if (error) {
    throw error;
  }

  return data as { url: string; gift_id: string; wishlist_id: string };
}
