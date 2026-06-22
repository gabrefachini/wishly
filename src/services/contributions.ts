import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";

type CreateContributionInput = {
  shareId: string;
  giftId: string;
  contributor_name: string;
  contributor_email: string;
  contributor_message?: string;
  amount: number;
  currency: string;
  locale: string;
};

export async function createContribution(input: CreateContributionInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("create_public_contribution", {
    p_share_id: input.shareId,
    p_gift_id: input.giftId,
    p_contributor_name: input.contributor_name,
    p_contributor_email: input.contributor_email,
    p_contributor_message: input.contributor_message || null,
    p_amount: input.amount,
    p_currency: input.currency,
    p_locale: input.locale,
  });

  if (error) {
    throw error;
  }

  return data as {
    contribution_id: string;
    checkout_url: string;
    payment_status: string;
  };
}

export async function getContributionCheckout(contributionId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("get_public_contribution_checkout", {
    p_contribution_id: contributionId,
  });

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    gift_id: string;
    wishlist_id: string;
    share_id: string;
    gift_name: string;
    amount: number;
    currency: string;
    payment_status: string;
    payment_provider: string;
  } | null;
}

export async function confirmMockContribution(contributionId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("confirm_mock_contribution", {
    p_contribution_id: contributionId,
  });

  if (error) {
    throw error;
  }

  return data as {
    contribution_id: string;
    gift_id: string;
    payment_status: string;
  };
}
