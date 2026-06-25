import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const wishlistSchema = z.object({
  title: z.string().min(1),
  occasion: z.string().min(1),
  event_date: z.string().optional().or(z.literal("")),
  message: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  theme_color: z.enum(["coral", "blush", "terracotta", "lavender", "sky", "sage"]),
  slug: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^[a-z0-9-]+$/.test(value), {
      message: "slug_format",
    })
    .refine((value) => !value || (value.length >= 3 && value.length <= 80), {
      message: "slug_length",
    }),
  visibility: z.enum(["private", "public_link"]),
  rsvp_enabled: z.boolean(),
  event_location: z.string().optional(),
  event_time: z.string().optional().or(z.literal("")),
  max_guests: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
});

export const createWishlistSchema = z.object({
  title: z.string().min(1),
  occasion: z.string().min(1),
  event_date: z.string().optional().or(z.literal("")),
  message: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["private", "public_link"]),
});

export const updateWishlistSchema = createWishlistSchema;

export const giftSchema = z.object({
  wishlist_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  store_url: z.string().url().optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  estimated_price: z
    .string()
    .optional()
    .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
  currency: z.string().min(3).max(3),
  priority: z.enum(["must_have", "nice_to_have", "surprise_me"]),
  purchase_type: z.enum(["individual", "collective"]),
  funding_goal_amount: z
    .string()
    .optional()
    .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
  source_sponsored_item_id: z.string().uuid().optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.purchase_type === "collective" && !value.funding_goal_amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["funding_goal_amount"],
      message: "required",
    });
  }
});

export const updateGiftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  store_url: z.string().url().optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  estimated_price: z
    .string()
    .optional()
    .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
  currency: z.string().min(3).max(3),
  priority: z.enum(["must_have", "nice_to_have", "surprise_me"]),
  purchase_type: z.enum(["individual", "collective"]),
  funding_goal_amount: z
    .string()
    .optional()
    .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
}).superRefine((value, context) => {
  if (value.purchase_type === "collective" && !value.funding_goal_amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["funding_goal_amount"],
      message: "required",
    });
  }
});

export const reservationSchema = z.object({
  reserver_name: z.string().min(1),
  reserver_email: z.string().email(),
  reserver_message: z.string().optional(),
});

export const contributionSchema = z.object({
  contributor_name: z.string().min(1),
  contributor_email: z.string().email(),
  contributor_message: z.string().optional(),
  amount: z
    .string()
    .min(1)
    .refine((value) => Number(value) > 0, { message: "positive_number" }),
});

export const rsvpSchema = z.object({
  guest_name: z.string().min(1),
  guest_email: z.string().email().optional().or(z.literal("")),
  guest_phone: z.string().optional(),
  response: z.enum(["yes", "no", "maybe"]),
  guests_count: z
    .string()
    .min(1)
    .refine((value) => Number(value) >= 1, { message: "positive_number" }),
  message: z.string().optional(),
  honeypot: z.string().optional(),
});

export const affiliateMerchantSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  status: z.enum(["active", "inactive", "manual", "unsupported"]),
  strategy: z.enum(["query_param", "deeplink_template", "api", "manual", "passthrough"]),
  deeplink_template: z.string().optional(),
  tracking_param_name: z.string().optional(),
  tracking_param_value: z.string().optional(),
  tracking_param_value_env_key: z.string().optional(),
  notes: z.string().optional(),
});

export const sponsoredItemSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
    destination_url: z.string().url(),
    merchant_id: z.string().uuid().optional().or(z.literal("")),
    category: z.string().optional(),
    occasion: z.string().optional(),
    price: z
      .string()
      .optional()
      .refine((value) => !value || Number(value) > 0, { message: "positive_number" }),
    currency: z.string().min(3).max(3),
    locale: z.enum(["en", "pt-BR", "all"]),
    status: z.enum(["draft", "active", "paused", "archived"]),
    priority: z
      .string()
      .min(1)
      .refine((value) => Number.isFinite(Number(value)), { message: "required" }),
    starts_at: z.string().optional().or(z.literal("")),
    ends_at: z.string().optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.starts_at && value.ends_at && new Date(value.starts_at) > new Date(value.ends_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "date_order",
      });
    }
  });
