import { supabase } from "./supabase.js";

export async function connectDatabase() {
  const { error } = await supabase.from("users").select("id").limit(1);
  if (error) throw error;
}
