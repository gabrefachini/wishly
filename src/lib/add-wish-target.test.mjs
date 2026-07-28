import assert from "node:assert/strict";
import test from "node:test";
import { resolveAddWishTargetId } from "./add-wish-target.ts";

const remoteInput = {
  availableWishlistIds: ["casa", "aniversario"],
  isRemoteMode: true,
  localWishlistId: "local",
};

test("global add flow requires an explicit destination in remote mode", () => {
  assert.equal(resolveAddWishTargetId({ ...remoteInput, requestedWishlistId: null }), null);
});

test("list-context add flow preserves a valid destination", () => {
  assert.equal(
    resolveAddWishTargetId({ ...remoteInput, requestedWishlistId: "aniversario" }),
    "aniversario",
  );
});

test("stale or foreign wishlist ids are rejected", () => {
  assert.equal(
    resolveAddWishTargetId({ ...remoteInput, requestedWishlistId: "outra-pessoa" }),
    null,
  );
});

test("local mode safely targets its only list", () => {
  assert.equal(
    resolveAddWishTargetId({
      ...remoteInput,
      requestedWishlistId: null,
      isRemoteMode: false,
    }),
    "local",
  );
});
