import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function readJson<T>(candidates: string[], fallback: T): Promise<T> {
  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(path.resolve(candidate), "utf8");
      return JSON.parse(content) as T;
    } catch {}
  }
  return fallback;
}

const users = await readJson<any[]>(["data/users.json"], []);
const sessions = await readJson<any[]>(["data/sessions.json"], []);
const applications = await readJson<any[]>(
  ["data/applications.json", "src/data/applications.json"],
  [],
);
const billing = await readJson<any[]>(["billing-orders.json", "data/billing-orders.json"], []);

if (users.length) {
  const { error } = await supabase.from("users").upsert(
    users.map((user) => ({
      id: user.id,
      email: String(user.email).toLowerCase(),
      password_hash: user.passwordHash ?? null,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      auth_provider: user.authProvider,
      google_subject: user.googleSubject ?? null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

if (sessions.length) {
  const { error } = await supabase.from("sessions").upsert(
    sessions.map((session) => ({
      id: session.id,
      user_id: session.userId,
      expires_at: session.expiresAt,
      created_at: session.createdAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

if (applications.length) {
  const { error } = await supabase.from("applications").upsert(
    applications.map((application) => ({
      id: application.id,
      user_id: application.user_id ?? application.userId,
      service_slug: application.service ?? application.serviceSlug,
      status: application.status,
      data: application.data ?? {},
      documents: application.documents ?? {},
      created_at: application.createdAt,
      updated_at: application.updatedAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

if (billing.length) {
  const { error } = await supabase.from("billing_orders").upsert(
    billing.map((order) => ({
      id: order.id,
      application_id: order.applicationId,
      user_id: order.userId,
      line_items: order.lineItems ?? [],
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency,
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

console.log(
  JSON.stringify(
    {
      migrated: {
        users: users.length,
        sessions: sessions.length,
        applications: applications.length,
        billingOrders: billing.length,
      },
    },
    null,
    2,
  ),
);
