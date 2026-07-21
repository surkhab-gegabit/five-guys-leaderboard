"use server";

import { auth } from "../../../auth";
import { sql } from "../../../lib/db";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";

export async function generateTwoFactorSecret() {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  // Generates a highly secure cryptographic secret
  const secret = speakeasy.generateSecret({
    name: `Five Guys (${session.user.email})` // This is what shows up in the Authenticator App
  });

  // Turns the secret URL into a scannable QR Code image
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url as string);

  return {
    secret: secret.base32,
    qrCodeUrl
  };
}

export async function verifyAndSaveTwoFactor(secret: string, token: string) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  // Check if the 6-digit code they typed matches the time-based math
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token
  });

  if (verified) {
    // If successful, save the secret permanently to their Neon database row
    await sql`UPDATE users SET two_factor_secret = ${secret} WHERE id = ${session.user.id}`;
    revalidatePath("/dashboard/security");
    return { success: true };
  }
  
  return { success: false };
}

export async function disableTwoFactor() {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");
  
  await sql`UPDATE users SET two_factor_secret = NULL WHERE id = ${session.user.id}`;
  revalidatePath("/dashboard/security");
}