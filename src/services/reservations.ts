import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";

type ReserveGiftInput = {
  shareId: string;
  giftId: string;
  reserver_name: string;
  reserver_email: string;
  reserver_message?: string;
};

export async function reserveGift(input: ReserveGiftInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("reserve_public_gift", {
    p_share_id: input.shareId,
    p_gift_id: input.giftId,
    p_reserver_name: input.reserver_name,
    p_reserver_email: input.reserver_email,
    p_reserver_message: input.reserver_message || null,
  });

  if (error) {
    throw error;
  }

  return data as { reservation_id: string; gift_id: string; status: string };
}
