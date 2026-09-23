import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["file", "supabase"]).default("supabase"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  PASSWORD_RESET_FROM: z.string().email().optional(),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY is required"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
