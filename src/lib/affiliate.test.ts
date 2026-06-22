import { describe, expect, it } from "vitest";
import { applyDeeplinkTemplate, buildGiftRedirectPath, extractMerchantDomain } from "./affiliate";

describe("affiliate helpers", () => {
  it("extracts a normalized merchant domain", () => {
    expect(extractMerchantDomain("https://www.mercadolivre.com.br/item?x=1")).toBe(
      "mercadolivre.com.br",
    );
  });

  it("returns null for invalid urls", () => {
    expect(extractMerchantDomain("not-a-url")).toBeNull();
  });

  it("builds a deeplink from template placeholders", () => {
    expect(
      applyDeeplinkTemplate(
        "https://affiliate.example/track?u={url}&tag={tag}",
        "https://shein.com/product/123",
        "wishly-tag",
      ),
    ).toBe(
      "https://affiliate.example/track?u=https%3A%2F%2Fshein.com%2Fproduct%2F123&tag=wishly-tag",
    );
  });

  it("builds the internal redirect path", () => {
    expect(buildGiftRedirectPath("gift-123", "sofia-7")).toBe("/go/gift/gift-123?shareId=sofia-7");
  });
});
