"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await signIn("credentials", {
        email: cleanEmail,
        password: password,
        token: token, 
        redirect: false,
      });

      if (res?.error) {
        // Intercept our custom error codes from auth.ts
        if (res.error === "2FA_REQUIRED") {
          setShowTwoFactor(true);
          setError(""); 
        } else if (res.error === "INVALID_2FA") {
          setError("Invalid 6-digit code. Please try again.");
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-t-8 border-[#DA291C]">
        <h1 className="text-3xl font-black text-gray-900 text-center mb-6">FIVE GUYS</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* STEP 1: Email and Password (Hides if 2FA is needed) */}
          <div className={showTwoFactor ? "hidden" : "block"}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email</label>
                <input 
                  type="email" 
                  required={!showTwoFactor} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-medium text-gray-900" 
                  placeholder="admin@fiveguys.com" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  required={!showTwoFactor} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-medium text-gray-900" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
          </div>

          {/* STEP 2: The 2FA Code Input (Shows if 2FA is needed) */}
          {showTwoFactor && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Authenticator Code</label>
              <p className="text-xs text-gray-500 mb-3">Open your authenticator app to view your 6-digit code.</p>
              <input 
                type="text" 
                required={showTwoFactor}
                maxLength={6} 
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:border-[#DA291C] font-black text-3xl tracking-widest text-center text-gray-900" 
                placeholder="000000" 
              />
            </div>
          )}

          {error && (
            <p className="text-[#DA291C] text-sm font-bold bg-red-50 p-3 rounded-md">{error}</p>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#DA291C] hover:bg-red-700 text-white font-black py-3 rounded-md transition-colors shadow-md uppercase tracking-wider mt-2"
          >
            {loading ? "Verifying..." : (showTwoFactor ? "Verify Code" : "Login")}
          </button>
        </form>

      </div>
    </div>
  );
}