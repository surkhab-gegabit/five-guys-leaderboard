"use client";

import { useState } from "react";
import { changePassword } from "./actions";
import Link from "next/link";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success" | "", message: string }>({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: "error", message: "New password must be at least 6 characters long." });
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.error) {
      setStatus({ type: "error", message: result.error });
    } else if (result.success) {
      setStatus({ type: "success", message: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 border-t-8 border-[#DA291C]">
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-[#DA291C] mb-6 inline-block transition-colors uppercase tracking-wider">
          ← Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-black text-gray-900 mb-6 border-b pb-4">Account Settings</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Current Password</label>
            <input 
              type="password" 
              required 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-medium text-gray-900" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
            <input 
              type="password" 
              required 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-medium text-gray-900" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-medium text-gray-900" 
            />
          </div>

          {status.message && (
            <div className={`p-3 rounded-md text-sm font-bold ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {status.message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-black py-3 rounded-md transition-colors shadow-md uppercase tracking-wider mt-4"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}