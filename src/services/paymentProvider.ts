export type PaymentProviderName = "mock" | "mercado_pago" | "stripe";

export type PaymentProviderService = {
  name: PaymentProviderName;
  isMock: boolean;
};

export const mockPaymentProviderService: PaymentProviderService = {
  name: "mock",
  isMock: true,
};
