import { sql } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Remove any old linking columns from the users table so we don't get conflicts
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS store_id;`;

    // 2. Completely destroy the old, empty stores table (CASCADE removes any hidden rules attached to it)
    await sql`DROP TABLE IF EXISTS stores CASCADE;`;

    // 3. Build our perfect, clean stores table from scratch
    await sql`
      CREATE TABLE stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
    `;

    // 4. Insert our two test stores
    await sql`
      INSERT INTO stores (name) 
      VALUES ('Store 1: Downtown'), ('Store 2: North Hill');
    `;

    // 5. Add a fresh store_id column to users, perfectly linked to our new table
    await sql`
      ALTER TABLE users 
      ADD COLUMN store_id INTEGER REFERENCES stores(id);
    `;

    // 6. Temporarily assign all existing users to Store 1 so they show up on the dashboard
    await sql`
      UPDATE users 
      SET store_id = 1;
    `;

    return NextResponse.json({ message: "Database completely reset and upgraded! Stores table built and linked." }, { status: 200 });
  } catch (error: any) {
    console.error("DATABASE UPGRADE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}