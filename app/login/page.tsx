"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        token: step === 2 ? token : undefined,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth v5 returns our custom error codes inside the error string
        if (res.error.includes("2FA_REQUIRED")) {
          setStep(2);
        } else if (res.error.includes("INVALID_2FA")) {
          setError("Incorrect or expired code. Please try again.");
        } else {
          setError("Invalid email or password.");
        }
      } else if (res?.ok) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // BRANDED BACKGROUND
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Red Accent Background */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-[#DA291C]" />

      <div className="relative w-full max-w-md z-10">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white text-[#DA291C] font-black text-5xl tracking-tighter px-6 py-3 shadow-lg transform -rotate-2 border-4 border-white outline outline-4 outline-[#DA291C]">
            FIVE GUYS
          </div>
          <div className="mt-6 text-white font-bold tracking-[0.3em] text-sm uppercase drop-shadow-md">
            Crew Leaderboard
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          
          {/* ICONIC CHECKERBOARD TRIM */}
          <div className="h-4 w-full flex">
            {[...Array(24)].map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-[#DA291C]' : 'bg-white'}`} />
            ))}
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 text-[#DA291C] font-bold text-sm px-4 py-3 rounded-lg border border-red-100 text-center animate-pulse">
                {error}
              </div>
            )}

            <div className="relative overflow-hidden min-h-[220px]">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: CREDENTIALS */}
                {step === 1 && (
                  <motion.form 
                    key="step-1"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5 absolute w-full"
                  >
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-widest">
                        Crew Email
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-[#DA291C] focus:ring-4 focus:ring-red-50 text-gray-900 bg-white font-bold outline-none transition-all"
                        placeholder="team@fiveguys.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-widest">
                        Password
                      </label>
                      <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-[#DA291C] focus:ring-4 focus:ring-red-50 text-gray-900 bg-white font-bold outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-[#DA291C] text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors uppercase tracking-widest mt-2 disabled:opacity-70"
                    >
                      {isLoading ? "Authenticating..." : "Login"}
                    </button>
                  </motion.form>
                )}

                {/* STEP 2: 2FA CODE */}
                {step === 2 && (
                  <motion.form 
                    key="step-2"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit} 
                    className="space-y-6 absolute w-full"
                  >
                    <div className="text-center">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Check Your Email</h3>
                      <p className="text-sm font-medium text-gray-500">
                        We sent a 6-digit code to <br/><span className="text-[#DA291C] font-bold">{email}</span>
                      </p>
                    </div>
                    
                    <div>
                      <input 
                        type="text" 
                        required 
                        maxLength={6}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} // Only allows numbers
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-[#DA291C] focus:ring-4 focus:ring-red-50 text-gray-900 bg-white font-black text-center text-3xl tracking-[0.5em] outline-none transition-all placeholder:tracking-normal"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-3">
                      <button 
                        type="submit" 
                        disabled={isLoading || token.length !== 6}
                        className="w-full bg-[#DA291C] text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => { setStep(1); setToken(""); setError(""); }}
                        className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 border-2 border-gray-100 transition-colors text-xs uppercase tracking-widest"
                      >
                        ← Back to Login
                      </button>
                    </div>
                  </motion.form>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}