"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type User = { id: string; name: string; role: string; total_points: number };

export default function InteractiveLeaderboard({ 
  leaderboard,
  managers,
  userRole, 
  updatePoints,
  deleteUser,
  resetPoints,
  storeId,
  changeRole
}: { 
  leaderboard: User[],
  managers: User[],
  userRole: string,
  updatePoints: (userId: string, points: number, reason: string) => Promise<void>,
  deleteUser: (userId: string) => Promise<void>,
  resetPoints: (storeId: number) => Promise<void>,
  storeId: number,
  changeRole: (userId: string, newRole: string) => Promise<{ success?: boolean; error?: string } | undefined>
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(true);
  const [pointAmount, setPointAmount] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Premium Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const isManager = userRole === "area_manager" || userRole === "store_manager";

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#DA291C', '#000000', '#ffffff']
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#DA291C', '#000000', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleOpenModal = (user: User, adding: boolean) => {
    setSelectedUser(user);
    setIsAdding(adding);
    setPointAmount(1);
    setReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    const finalPoints = isAdding ? pointAmount : -Math.abs(pointAmount);
    
    await updatePoints(selectedUser.id, finalPoints, reason);
    
    if (isAdding) triggerConfetti();
    
    setIsSubmitting(false);
    setSelectedUser(null);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset ALL points? This cannot be undone.")) {
      setIsResetting(true);
      await resetPoints(storeId);
      setIsResetting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to completely remove ${user.name}?`)) {
      await deleteUser(user.id);
    }
  };

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>, user: User) => {
    const newRole = e.target.value;
    if (newRole === user.role) return;

    const formattedRole = newRole.replace('_', ' ');
    if (window.confirm(`Are you sure you want to change ${user.name}'s role to ${formattedRole}?`)) {
      const selectElement = e.target;
      selectElement.disabled = true; 
      try {
        const result = await changeRole(user.id, newRole);
        if (result && result.error) {
          alert(result.error);
          selectElement.value = user.role; 
        }
      } catch (error) {
        alert("Database connection error.");
        selectElement.value = user.role; 
      } finally {
        selectElement.disabled = false; 
      }
    } else {
      e.target.value = user.role; 
    }
  };

  const getBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return <span className="text-gray-300 dark:text-gray-700">#{index + 1}</span>;
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-300">
      
      {/* PREMIUM HEADER WITH THEME TOGGLE */}
      <div className="px-8 py-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
            Leaderboard
          </h2>
          
          {/* ANIMATED DARK MODE TOGGLE */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="relative flex items-center justify-between w-16 h-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-full cursor-pointer transition-colors duration-300 border border-gray-200 dark:border-gray-700"
            aria-label="Toggle Dark Mode"
          >
            <span className="z-10 flex justify-center w-1/2 text-yellow-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </span>
            <span className="z-10 flex justify-center w-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </span>
            <motion.div 
              className="absolute w-6 h-6 bg-white dark:bg-black rounded-full shadow-md top-1/2"
              initial={false}
              animate={{ 
                left: isDarkMode ? "calc(100% - 28px)" : "4px",
                y: "-50%" 
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {isManager && (
          <button 
            onClick={handleReset} 
            disabled={isResetting}
            className="text-xs font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-widest disabled:opacity-50 border border-gray-200 dark:border-gray-700"
          >
            {isResetting ? "Resetting..." : "Reset All Points"}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#111] text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <th className="px-8 py-4 font-bold w-24">Rank</th>
              <th className="px-8 py-4 font-bold">Crew Member</th>
              <th className="px-8 py-4 font-bold">Position</th>
              <th className="px-8 py-4 font-bold text-right">Score</th>
              {isManager && <th className="px-8 py-4 font-bold text-center">Manage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
            <AnimatePresence>
              {leaderboard.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={5} className="px-8 py-16 text-center text-gray-400 dark:text-gray-600 font-medium tracking-wide">
                    No crew members on the board yet.
                  </td>
                </motion.tr>
              )}
              {leaderboard.map((user, index) => (
                <motion.tr 
                  layout
                  key={user.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-8 py-6 text-3xl font-black">{getBadge(index)}</td>
                  <td className="px-8 py-6 font-bold text-gray-900 dark:text-white tracking-tight text-lg">{user.name}</td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize uppercase tracking-widest border border-transparent dark:border-gray-700">
                      {user.role === "area_manager" ? "Admin" : user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-black text-right text-2xl text-[#DA291C] dark:text-[#ff4d40]">
                    {user.total_points}
                  </td>
                  
                  {isManager && (
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        <select
                          key={`${user.id}-${user.role}`} 
                          defaultValue={user.role}
                          onChange={(e) => handleRoleChange(e, user)}
                          className="text-[10px] font-bold bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-2 uppercase cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 outline-none shadow-sm disabled:opacity-50 transition-colors"
                        >
                          <option value="employee">Employee</option>
                          <option value="shift_leader">Shift Leader</option>
                          <option value="agm">AGM</option>
                        </select>

                        {userRole === "store_manager" && (
                          <div className="flex space-x-1">
                            <button onClick={() => handleOpenModal(user, false)} title="Deduct Points" className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">-</button>
                            <button onClick={() => handleOpenModal(user, true)} title="Add Points" className="bg-[#DA291C] hover:bg-red-700 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">+</button>
                          </div>
                        )}
                        <button onClick={() => handleDelete(user)} title="Delete Employee" className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">✕</button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* LEADERSHIP SECTION */}
      {managers && managers.length > 0 && (
        <div className="bg-gray-50 dark:bg-[#111] border-t border-gray-100 dark:border-gray-800 p-8 transition-colors duration-300">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            Leadership Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{manager.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{manager.role.replace('_', ' ')}</p>
                </div>
                {userRole === "area_manager" && (
                  <button 
                    onClick={() => handleDelete(manager)} 
                    title="Remove Manager" 
                    className="opacity-0 group-hover:opacity-100 bg-gray-50 dark:bg-[#0a0a0a] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-gray-400 dark:text-gray-600 font-bold w-8 h-8 rounded-lg transition-all flex items-center justify-center text-xs border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DARK MODE OPTIMIZED MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-2xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-100 dark:border-gray-800"
            >
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
                {isAdding ? "Award Points" : "Deduct Points"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                Updating ledger for <span className="font-bold text-gray-900 dark:text-white">{selectedUser.name}</span>
              </p>
              <form onSubmit={handleSubmit}>
                <div className="flex space-x-4 mb-6">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">Amount</label>
                    <select 
                      value={pointAmount} 
                      onChange={(e) => setPointAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-[#DA291C] dark:focus:border-[#ff4d40] text-gray-900 dark:text-white bg-white dark:bg-[#0a0a0a] font-black text-lg outline-none transition-colors"
                    >
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">Reason</label>
                    <input 
                      type="text" 
                      required 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-[#DA291C] dark:focus:border-[#ff4d40] text-gray-900 dark:text-white bg-white dark:bg-[#0a0a0a] font-medium outline-none transition-colors" 
                      placeholder="e.g., Deep cleaned" 
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-3 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors shadow-md ${isAdding ? 'bg-[#DA291C] hover:bg-red-700' : 'bg-gray-900 dark:bg-white dark:text-black hover:bg-black dark:hover:bg-gray-200'}`}>
                    {isSubmitting ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}