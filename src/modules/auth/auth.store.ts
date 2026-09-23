import crypto from "node:crypto";
import { supabase } from "../../config/supabase.js";
import type { Session, User } from "./auth.types.js";

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  role: User["role"];
  auth_provider: User["authProvider"];
  google_subject: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
};

const fromUserRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  firstName: row.first_name,
  lastName: row.last_name,
  role: row.role,
  authProvider: row.auth_provider,
  googleSubject: row.google_subject,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fromSessionRow = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.user_id,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

export const userStore = {
  async findById(id: string) {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromUserRow(data as UserRow) : null;
  },

  async findByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? fromUserRow(data as UserRow) : null;
  },

  async findByGoogleSubject(googleSubject: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("google_subject", googleSubject)
      .maybeSingle();
    if (error) throw error;
    return data ? fromUserRow(data as UserRow) : null;
  },

  async create(data: Omit<User, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email: data.email,
        password_hash: data.passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        auth_provider: data.authProvider,
        google_subject: data.googleSubject,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) throw error;
    return fromUserRow(created as UserRow);
  },

  async update(id: string, changes: Partial<User>) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (changes.email !== undefined) payload.email = changes.email;
    if (changes.passwordHash !== undefined) payload.password_hash = changes.passwordHash;
    if (changes.firstName !== undefined) payload.first_name = changes.firstName;
    if (changes.lastName !== undefined) payload.last_name = changes.lastName;
    if (changes.role !== undefined) payload.role = changes.role;
    if (changes.authProvider !== undefined) payload.auth_provider = changes.authProvider;
    if (changes.googleSubject !== undefined) payload.google_subject = changes.googleSubject;

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromUserRow(data as UserRow) : null;
  },
};

export const sessionStore = {
  async create(userId: string, expiresAt: string) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return fromSessionRow(data as SessionRow);
  },

  async findById(id: string) {
    const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromSessionRow(data as SessionRow) : null;
  },

  async delete(id: string) {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) throw error;
  },
};
