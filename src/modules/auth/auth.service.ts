import argon2 from "argon2";
import { createHash, createPublicKey, randomBytes, verify as verifySignature } from "node:crypto";
import { AppError } from "../../core/errors.js";
import { env } from "../../config/env.js";
import { supabase } from "../../config/supabase.js";
import { userStore, sessionStore } from "./auth.store.js";
import type {
  ForgotPasswordInput,
  GoogleInput,
  LoginInput,
  RegisterInput,
} from "./auth.schemas.js";
import type { PublicUser, User } from "./auth.types.js";

export const SESSION_COOKIE = "audvertax_session";
const SESSION_DAYS = 7;
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const TEMPORARY_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
type GoogleJwk = { kid: string; kty: string; alg: string; n: string; e: string };
type GooglePayload = {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  exp?: number;
  iat?: number;
};
type GoogleKeySet = { keys: GoogleJwk[] };
let googleKeys: GoogleKeySet | null = null;
let googleKeysExpiresAt = 0;

// The current local JSON store has no transaction/unique-constraint support.
// Serialize account creation in this process so concurrent requests cannot
// both pass the email uniqueness check before either writes the user file.
// The future database implementation must enforce the same invariant with a
// database UNIQUE constraint/transaction.
let accountCreationQueue: Promise<void> = Promise.resolve();
async function withAccountCreationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = accountCreationQueue;
  let release!: () => void;
  accountCreationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function publicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function register(input: RegisterInput) {
  return withAccountCreationLock(async () => {
    const email = normalizeEmail(input.email);
    if (await userStore.findByEmail(email))
      throw new AppError("An account with this email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await userStore.create({
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: "customer",
      authProvider: "password",
      googleSubject: null,
    });
    const session = await createSession(user.id);
    return { user: publicUser(user), sessionId: session.id, expiresAt: session.expiresAt };
  });
}

export async function login(input: LoginInput) {
  const user = await userStore.findByEmail(normalizeEmail(input.email));
  if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, input.password)))
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  const session = await createSession(user.id);
  return { user: publicUser(user), sessionId: session.id, expiresAt: session.expiresAt };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await userStore.findByEmail(normalizeEmail(input.email));
  if (!user)
    throw new AppError("No account was found with that email address.", 404, "ACCOUNT_NOT_FOUND");
  if (!user.passwordHash)
    throw new AppError(
      "This account uses Google sign-in. Please continue with Google.",
      400,
      "GOOGLE_ACCOUNT",
    );

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error: cleanupError } = await supabase
    .from("password_reset_tokens")
    .delete()
    .eq("user_id", user.id);
  if (cleanupError) throw cleanupError;

  const { error } = await supabase.from("password_reset_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw error;

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  if (env.NODE_ENV === "production" && (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM)) {
    throw new AppError(
      "Password recovery email is not configured on the server.",
      503,
      "RESET_EMAIL_NOT_CONFIGURED",
    );
  }
  if (env.RESEND_API_KEY && env.PASSWORD_RESET_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.PASSWORD_RESET_FROM,
        to: [user.email],
        subject: "Reset your Audvertax password",
        html: `<p>We received a request to reset your Audvertax password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes and can only be used once.</p>`,
      }),
    });
    if (!response.ok) {
      throw new AppError(
        "Password reset email could not be sent. Please try again later.",
        503,
        "RESET_EMAIL_FAILED",
      );
    }
  }

  return {
    message: "Password reset instructions have been created.",
    resetToken: env.NODE_ENV === "production" ? undefined : rawToken,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new AppError(
      "This password reset link is invalid or has expired.",
      400,
      "INVALID_RESET_TOKEN",
    );

  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await userStore.update(data.user_id as string, { passwordHash });

  const { error: consumeError } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);
  if (consumeError) throw consumeError;
  const { data: sessions, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", data.user_id as string);
  if (sessionError) throw sessionError;
  if (sessions?.length) {
    const { error: deleteSessionError } = await supabase
      .from("sessions")
      .delete()
      .in(
        "id",
        sessions.map((session) => session.id),
      );
    if (deleteSessionError) throw deleteSessionError;
  }

  return { message: "Your password has been reset. You can now sign in." };
}

export async function loginWithGoogle(input: GoogleInput) {
  if (!env.GOOGLE_CLIENT_ID)
    throw new AppError(
      "Google sign-in is not configured on the server.",
      503,
      "GOOGLE_NOT_CONFIGURED",
    );
  const googleUser = await verifyGoogleCredential(input.credential);
  const email = normalizeEmail(googleUser.email!);

  return withAccountCreationLock(async () => {
    let user = await userStore.findByGoogleSubject(googleUser.sub!);
    if (!user) {
      const existingByEmail = await userStore.findByEmail(email);
      if (existingByEmail)
        throw new AppError(
          "An account with this email already exists. Sign in with your email and password first.",
          409,
          "EMAIL_ALREADY_EXISTS",
        );
      user = await userStore.create({
        email,
        passwordHash: null,
        firstName: googleUser.given_name?.trim() || "Google",
        lastName: googleUser.family_name?.trim() || "User",
        role: "customer",
        authProvider: "google",
        googleSubject: googleUser.sub!,
      });
    }
    const session = await createSession(user.id);
    return { user: publicUser(user), sessionId: session.id, expiresAt: session.expiresAt };
  });
}

async function verifyGoogleCredential(credential: string): Promise<GooglePayload> {
  const parts = credential.split(".");
  if (parts.length !== 3)
    throw new AppError("Invalid Google credential.", 401, "INVALID_GOOGLE_CREDENTIAL");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header: { alg?: string; kid?: string };
  let payload: GooglePayload;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new AppError("Invalid Google credential.", 401, "INVALID_GOOGLE_CREDENTIAL");
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    header.alg !== "RS256" ||
    !header.kid ||
    !payload.sub ||
    !payload.email ||
    !payload.iss ||
    !payload.aud ||
    !GOOGLE_ISSUERS.has(payload.iss) ||
    payload.aud !== env.GOOGLE_CLIENT_ID ||
    payload.email_verified !== true ||
    !payload.exp ||
    payload.exp <= now ||
    (payload.iat !== undefined && payload.iat > now + 60)
  )
    throw new AppError("Google credential verification failed.", 401, "INVALID_GOOGLE_CREDENTIAL");

  const keys = await getGoogleKeys();
  const jwk = keys.keys.find(
    (key) => key.kid === header.kid && key.kty === "RSA" && key.alg === "RS256",
  );
  if (!jwk)
    throw new AppError("Google credential verification failed.", 401, "INVALID_GOOGLE_CREDENTIAL");
  const key = createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" });
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    key,
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid)
    throw new AppError("Google credential verification failed.", 401, "INVALID_GOOGLE_CREDENTIAL");
  return payload;
}

async function getGoogleKeys(): Promise<GoogleKeySet> {
  if (googleKeys && googleKeysExpiresAt > Date.now()) return googleKeys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok)
    throw new AppError(
      "Google credential verification is temporarily unavailable.",
      503,
      "GOOGLE_VERIFICATION_UNAVAILABLE",
    );
  const keys = (await response.json()) as GoogleKeySet;
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 300);
  googleKeys = keys;
  googleKeysExpiresAt = Date.now() + Math.min(Math.max(maxAge, 60), 24 * 60 * 60) * 1000;
  return keys;
}

export async function getUserFromSession(sessionId: string) {
  const session = await sessionStore.findById(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await sessionStore.delete(session.id);
    return null;
  }
  const user = await userStore.findById(session.userId);
  return user ? publicUser(user) : null;
}
export async function logout(sessionId: string) {
  await sessionStore.delete(sessionId);
}
async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return sessionStore.create(userId, expiresAt);
}
