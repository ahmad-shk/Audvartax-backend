export type BillingStatus = "pending" | "paid";

export type BillingLineItem = {
  key: string;
  label: string;
  quantity: number;
  unitAmount: number;
  total: number;
  currency: "USD" | "GBP" | "PKR";
};

export type BillingOrder = {
  id: string;
  applicationId: string;
  userId: string;
  lineItems: BillingLineItem[];
  subtotal: number;
  total: number;
  currency: "USD" | "GBP" | "PKR";
  status: BillingStatus;
  createdAt: string;
  updatedAt: string;
};
