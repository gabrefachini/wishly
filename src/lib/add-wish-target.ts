type ResolveAddWishTargetInput = {
  requestedWishlistId: string | null;
  availableWishlistIds: string[];
  isRemoteMode: boolean;
  localWishlistId: string;
};

/**
 * No modo conectado, só aceita uma escolha explícita que ainda pertença à
 * pessoa. No modo local existe uma única lista, então ela é o destino seguro.
 */
export function resolveAddWishTargetId(input: ResolveAddWishTargetInput) {
  if (!input.isRemoteMode) return input.localWishlistId;
  if (!input.requestedWishlistId) return null;
  return input.availableWishlistIds.includes(input.requestedWishlistId)
    ? input.requestedWishlistId
    : null;
}
