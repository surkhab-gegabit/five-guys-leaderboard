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
        // NextAuth hides our custom error codes to prevent credential hacking.
        // If we get an error and we haven't shown the 2FA box yet, we switch to it!
        if (!showTwoFactor) {
          setShowTwoFactor(true);
          setError(""); 
        } else {
          // If they are already on the 2FA screen and get an error, the code (or password) was definitely wrong.
          setError("Invalid email, password, or 6-digit code.");
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
          
          {/* STEP 1: Email and Password */}
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

          {/* STEP 2: The 2FA Code Input */}
          {showTwoFactor && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Authenticator Code</label>
                <button 
                  type="button" 
                  onClick={() => { setShowTwoFactor(false); setToken(""); }} 
                  className="text-xs text-[#DA291C] font-bold hover:underline"
                >
                  ← Back
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">If your credentials are correct, a code was sent to your email.</p>
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