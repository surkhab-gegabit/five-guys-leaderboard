import { NextResponse } from 'next/server';
import { sql } from '@/lib/db'; // Update to '../lib/db' if your lib folder isn't configured for @ alias
import bcrypt from 'bcryptjs';

export async function GET() {
  // Scramble the password securely
  const hash = await bcrypt.hash('burgers123', 10);
  
  try {
    await sql`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ('Area Manager', 'admin@fiveguys.com', ${hash}, 'area_manager')
    `;
    return NextResponse.json({ message: 'Success! Test user created.' });
  } catch (error) {
    return NextResponse.json({ error: 'User already exists or database error' }, { status: 400 });
  }
}