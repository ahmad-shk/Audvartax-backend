import "ws";
import { WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket as typeof globalThis.WebSocket;
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
