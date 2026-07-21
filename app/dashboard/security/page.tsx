import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { sql } from "../../../lib/db";
import TwoFactorSetup from "./TwoFactorSetup";
import Link from "next/link";

export default async function SecurityPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  // Check the database to see if they already have a secret key saved
  const userResult = await sql`SELECT two_factor_secret FROM users WHERE id = ${session.user.id}`;
  const is2FAEnabled = !!userResult[0]?.two_factor_secret;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8 border-t-4 border-[#DA291C]">
        <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-[#DA291C] mb-6 inline-block transition-colors">
          ← BACK TO DASHBOARD
        </Link>
        <h1 className="text-3xl font-black text-gray-900 border-b pb-4">Security Settings</h1>
        
        {/* Render our client component and pass in the database status */}
        <TwoFactorSetup is2FAEnabled={is2FAEnabled} />
      </div>
    </div>
  );
}