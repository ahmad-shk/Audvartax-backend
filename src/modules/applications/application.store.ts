import crypto from "node:crypto";
import { supabase } from "../../config/supabase.js";
import type { Application } from "./application.types.js";

type ApplicationRow = {
  id: string;
  user_id: string;
  service_slug: string;
  status: Application["status"];
  data: Record<string, unknown>;
  documents: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function fromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    serviceSlug: row.service_slug,
    status: row.status,
    data: row.data ?? {},
    documents: row.documents ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const applicationStore = {
  async listAll() {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ApplicationRow[]).map(fromRow);
  },

  async listByUser(userId: string) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as ApplicationRow[]).map(fromRow);
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ApplicationRow) : null;
  },

  async create(data: Omit<Application, "id" | "createdAt" | "updatedAt">) {
    const { data: created, error } = await supabase
      .from("applications")
      .insert({
        id: "app_" + crypto.randomUUID(),
        user_id: data.userId,
        service_slug: data.serviceSlug,
        status: data.status,
        data: data.data,
        documents: data.documents,
      })
      .select("*")
      .single();

    if (error) throw error;
    return fromRow(created as ApplicationRow);
  },

  async update(id: string, changes: Partial<Application>) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (changes.userId !== undefined) payload.user_id = changes.userId;
    if (changes.serviceSlug !== undefined) payload.service_slug = changes.serviceSlug;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.data !== undefined) payload.data = changes.data;
    if (changes.documents !== undefined) payload.documents = changes.documents;

    const { data, error } = await supabase
      .from("applications")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as ApplicationRow) : null;
  },

  async delete(id: string) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw error;
  },
};
