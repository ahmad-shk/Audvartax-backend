import crypto from "node:crypto";
import { supabase } from "../../config/supabase.js";
import type { BillingOrder } from "./billing.types.js";

type BillingRow = {
  id: string;
  application_id: string;
  user_id: string;
  line_items: BillingOrder["lineItems"];
  subtotal: number;
  total: number;
  currency: BillingOrder["currency"];
  status: BillingOrder["status"];
  created_at: string;
  updated_at: string;
};

const fromRow = (row: BillingRow): BillingOrder => ({
  id: row.id,
  applicationId: row.application_id,
  userId: row.user_id,
  lineItems: row.line_items ?? [],
  subtotal: Number(row.subtotal),
  total: Number(row.total),
  currency: row.currency,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listOrdersByUser(userId: string) {
  const { data, error } = await supabase
    .from("billing_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BillingRow[]).map(fromRow);
}

export async function findOrder(applicationId: string, userId: string) {
  const { data, error } = await supabase
    .from("billing_orders")
    .select("*")
    .eq("application_id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as BillingRow) : null;
}

export async function createOrder(input: Omit<BillingOrder, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("billing_orders")
    .insert({
      id: crypto.randomUUID(),
      application_id: input.applicationId,
      user_id: input.userId,
      line_items: input.lineItems,
      subtotal: input.subtotal,
      total: input.total,
      currency: input.currency,
      status: input.status,
    })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data as BillingRow);
}

export async function createOrderIfAbsent(
  input: Omit<BillingOrder, "id" | "createdAt" | "updatedAt">,
) {
  const existing = await findOrder(input.applicationId, input.userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("billing_orders")
    .insert({
      id: crypto.randomUUID(),
      application_id: input.applicationId,
      user_id: input.userId,
      line_items: input.lineItems,
      subtotal: input.subtotal,
      total: input.total,
      currency: input.currency,
      status: input.status,
    })
    .select("*")
    .single();

  if (error?.code === "23505") return findOrder(input.applicationId, input.userId);
  if (error) throw error;
  return fromRow(data as BillingRow);
}

export async function updateOrder(id: string, changes: Partial<BillingOrder>) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.applicationId !== undefined) payload.application_id = changes.applicationId;
  if (changes.userId !== undefined) payload.user_id = changes.userId;
  if (changes.lineItems !== undefined) payload.line_items = changes.lineItems;
  if (changes.subtotal !== undefined) payload.subtotal = changes.subtotal;
  if (changes.total !== undefined) payload.total = changes.total;
  if (changes.currency !== undefined) payload.currency = changes.currency;
  if (changes.status !== undefined) payload.status = changes.status;

  const { data, error } = await supabase
    .from("billing_orders")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as BillingRow) : null;
}
