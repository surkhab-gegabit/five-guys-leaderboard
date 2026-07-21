import { sql } from "../../../lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const hash = await bcrypt.hash("burgers123", 10);
    
    // Insert the admin account back into the database
    await sql`
      INSERT INTO users (name, email, password_hash, role, store_id, total_points) 
      VALUES ('Admin Manager', 'admin@fiveguys.com', ${hash}, 'area_manager', 1, 0)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = 'area_manager';
    `;
    
    return NextResponse.json({ message: "Admin account fully restored! You can log in now." }, { status: 200 });
  } catch (error: any) {
    console.error("RESTORE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}