"use client";

import { useState } from "react";
import { generateTwoFactorSecret, verifyAndSaveTwoFactor, disableTwoFactor } from "./actions";

export default function TwoFactorSetup({ is2FAEnabled }: { is2FAEnabled: boolean }) {
  const [setupData, setSetupData] = useState<{ secret: string, qrCodeUrl: string } | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBeginSetup = async () => {
    setLoading(true);
    const data = await generateTwoFactorSecret();
    setSetupData(data);
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const result = await verifyAndSaveTwoFactor(setupData!.secret, token);
    if (!result.success) {
      setError("Invalid 6-digit code. Please try again.");
    }
    
    setLoading(false);
  };

  const handleDisable = async () => {
    if(window.confirm("Are you sure you want to disable 2FA? This makes your account vulnerable.")) {
      await disableTwoFactor();
    }
  }

  // If they already set it up, show the green success screen
  if (is2FAEnabled) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-black text-green-800 mb-2">2FA is currently ENABLED</h3>
        <p className="text-green-700 font-medium mb-6">Your account is secured with Two-Factor Authentication.</p>
        <button onClick={handleDisable} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-md transition-colors shadow-sm">
          Disable 2FA
        </button>
      </div>
    );
  }

  // If they haven't set it up, walk them through the QR flow
  return (
    <div className="mt-6">
      {!setupData ? (
        <div>
          <p className="text-gray-600 mb-6 font-medium">Protect your admin account by requiring a 6-digit code from your phone every time you log in.</p>
          <button onClick={handleBeginSetup} disabled={loading} className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md">
            {loading ? "Generating Secure Keys..." : "Setup Two-Factor Authentication"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-2">1. Scan the QR Code</h3>
            <p className="text-sm text-gray-500 mb-4">Open Google Authenticator (or Apple Passwords) on your phone and scan this code.</p>
            <div className="bg-white p-4 inline-block border-2 border-gray-200 rounded-xl">
              <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-2">2. Enter the 6-digit code</h3>
            <form onSubmit={handleVerify} className="flex space-x-3 max-w-sm">
              <input 
                type="text" 
                maxLength={6} 
                required 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                placeholder="000000" 
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-bold text-2xl tracking-widest text-center" 
              />
              <button type="submit" disabled={loading} className="bg-[#DA291C] hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors shadow-md">
                {loading ? "..." : "Verify"}
              </button>
            </form>
            {error && <p className="text-red-600 font-bold mt-2 text-sm">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}