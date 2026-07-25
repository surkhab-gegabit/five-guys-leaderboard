"use client";

import { useState } from "react";
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

  const isManager = userRole === "area_manager" || userRole === "store_manager";

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#DA291C', '#ffffff', '#ffd700']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#DA291C', '#ffffff', '#ffd700']
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
    
    if (isAdding) {
      triggerConfetti();
    }
    
    setIsSubmitting(false);
    setSelectedUser(null);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset ALL points? This starts a new month and cannot be undone.")) {
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
    return <span className="text-gray-400">#{index + 1}</span>;
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 relative transition-all">
      
      {/* PREMIUM HEADER */}
      <div className="px-8 py-6 bg-gradient-to-r from-gray-900 to-black flex justify-between items-center">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <span className="text-[#DA291C]">⚡</span> Live Leaderboard
        </h2>
        {isManager && (
          <button 
            onClick={handleReset} 
            disabled={isResetting}
            className="text-xs font-bold bg-white/10 text-white px-5 py-2.5 rounded-lg hover:bg-[#DA291C] hover:shadow-[0_0_15px_rgba(218,41,28,0.5)] transition-all uppercase tracking-widest disabled:opacity-50 backdrop-blur-sm"
          >
            {isResetting ? "Resetting..." : "Reset Season"}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-100">
              <th className="px-8 py-5 font-bold">Rank</th>
              <th className="px-8 py-5 font-bold">Crew Member</th>
              <th className="px-8 py-5 font-bold">Position</th>
              <th className="px-8 py-5 font-bold text-right">Score</th>
              {isManager && <th className="px-8 py-5 font-bold text-center">Command Center</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 relative">
            <AnimatePresence>
              {leaderboard.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium tracking-wide">
                    The board is quiet. Time to make some moves.
                  </td>
                </motion.tr>
              )}
              {leaderboard.map((user, index) => (
                <motion.tr 
                  layout
                  key={user.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="hover:bg-red-50/30 transition-colors group bg-white"
                >
                  <td className="px-8 py-5 text-2xl font-black">{getBadge(index)}</td>
                  <td className="px-8 py-5 font-bold text-gray-900 tracking-tight">{user.name}</td>
                  <td className="px-8 py-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 capitalize uppercase tracking-wider">
                      {user.role === "area_manager" ? "Admin" : user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-black text-right text-xl">
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#DA291C] to-red-600">
                      {user.total_points}
                    </span>
                  </td>
                  
                  {isManager && (
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center space-x-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        
                        <select
                          key={`${user.id}-${user.role}`} 
                          defaultValue={user.role}
                          onChange={(e) => handleRoleChange(e, user)}
                          className="text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 uppercase cursor-pointer hover:bg-gray-200 hover:border-gray-300 outline-none shadow-sm disabled:opacity-50 transition-all focus:ring-2 focus:ring-[#DA291C]/20"
                        >
                          <option value="employee">Employee</option>
                          <option value="shift_leader">Shift Leader</option>
                          <option value="agm">AGM</option>
                        </select>

                        {userRole === "store_manager" && (
                          <div className="flex bg-gray-100 rounded-lg p-1 shadow-inner">
                            <button onClick={() => handleOpenModal(user, false)} title="Deduct Points" className="hover:bg-white text-gray-600 font-bold w-7 h-7 rounded-md flex items-center justify-center transition-all shadow-sm">-</button>
                            <button onClick={() => handleOpenModal(user, true)} title="Add Points" className="bg-[#DA291C] hover:bg-red-600 text-white font-bold w-7 h-7 rounded-md flex items-center justify-center transition-all shadow-sm mx-1">+</button>
                          </div>
                        )}
                        <button onClick={() => handleDelete(user)} title="Delete Employee" className="bg-gray-800 hover:bg-black text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg">✕</button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* STORE MANAGEMENT TEAM SECTION */}
      {managers && managers.length > 0 && (
        <div className="bg-gray-50/80 border-t border-gray-100 p-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div> Leadership Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                <div>
                  <p className="font-bold text-gray-900 tracking-tight">{manager.name}</p>
                  <p className="text-[10px] font-bold text-[#DA291C] uppercase tracking-widest mt-0.5">{manager.role.replace('_', ' ')}</p>
                </div>
                {userRole === "area_manager" && (
                  <button 
                    onClick={() => handleDelete(manager)} 
                    title="Remove Manager" 
                    className="opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-400 font-bold w-8 h-8 rounded-lg transition-all flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GLASSMORPHISM POINTS MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)] p-8 w-full max-w-sm border border-white/20"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
                {isAdding ? "Award Points" : "Deduct Points"}
              </h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Updating ledger for <span className="font-bold text-[#DA291C]">{selectedUser.name}</span>
              </p>
              <form onSubmit={handleSubmit}>
                <div className="flex space-x-4 mb-6">
                  <div className="w-1/3">
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Amount</label>
                    <select 
                      value={pointAmount} 
                      onChange={(e) => setPointAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] focus:ring-4 focus:ring-[#DA291C]/10 text-gray-900 bg-gray-50 hover:bg-white font-black text-lg transition-all outline-none"
                    >
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Reason</label>
                    <input 
                      type="text" 
                      required 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] focus:ring-4 focus:ring-[#DA291C]/10 text-gray-900 bg-gray-50 hover:bg-white font-medium transition-all outline-none" 
                      placeholder="e.g., Deep cleaned" 
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className={`flex-1 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${isAdding ? 'bg-gradient-to-r from-[#DA291C] to-red-600' : 'bg-gradient-to-r from-gray-800 to-black'}`}>
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