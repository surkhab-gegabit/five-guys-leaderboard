"use server";

import { auth } from "../../../auth";
import { sql } from "../../../lib/db";
import bcrypt from "bcryptjs";

export async function changePassword(currentPass: string, newPass: string) {
  const session = await auth();
  if (!session || !session.user) {
    return { error: "Unauthorized" };
  }

  // Fetch the user's current encrypted password from the database
  const userId = session.user.id;
  const users = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
  const user = users[0];

  if (!user || !user.password_hash) {
    return { error: "User not found" };
  }

  // Verify they typed their current password correctly
  const isCorrect = await bcrypt.compare(currentPass, user.password_hash);
  if (!isCorrect) {
    return { error: "Your current password is incorrect." };
  }

  // Encrypt the new password and save it
  const newHash = await bcrypt.hash(newPass, 10);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId}`;

  return { success: true };
}