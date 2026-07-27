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
    
    if (isAdding) {
      triggerConfetti();
    }
    
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
    return <span className="text-gray-300">#{index + 1}</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
      
      {/* MOBILE OPTIMIZED HEADER */}
      <div className="px-5 py-6 md:px-8 md:py-8 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-start sm:items-center bg-white">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase">
          Leaderboard
        </h2>
        {isManager && (
          <button 
            onClick={handleReset} 
            disabled={isResetting}
            className="w-full sm:w-auto text-xs font-bold bg-gray-50 text-gray-600 px-5 py-3 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors uppercase tracking-widest disabled:opacity-50 border border-gray-200"
          >
            {isResetting ? "Resetting..." : "Reset All Points"}
          </button>
        )}
      </div>
      
      {/* TABLE WRAPPER - Preserves scrolling on tiny screens */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[10px] md:text-[11px] uppercase tracking-widest border-b border-gray-100">
              <th className="px-4 py-3 md:px-8 md:py-4 font-bold w-16 md:w-24">Rank</th>
              <th className="px-4 py-3 md:px-8 md:py-4 font-bold">Crew Member</th>
              <th className="px-4 py-3 md:px-8 md:py-4 font-bold">Position</th>
              <th className="px-4 py-3 md:px-8 md:py-4 font-bold text-right">Score</th>
              {isManager && <th className="px-4 py-3 md:px-8 md:py-4 font-bold text-center">Manage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            <AnimatePresence>
              {leaderboard.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={5} className="px-4 py-12 md:px-8 md:py-16 text-center text-gray-400 font-medium tracking-wide">
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
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-4 py-4 md:px-8 md:py-6 text-2xl md:text-3xl font-black">{getBadge(index)}</td>
                  <td className="px-4 py-4 md:px-8 md:py-6 font-bold text-gray-900 tracking-tight text-base md:text-lg">{user.name}</td>
                  <td className="px-4 py-4 md:px-8 md:py-6">
                    <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-gray-100 text-gray-600 capitalize uppercase tracking-widest">
                      {user.role === "area_manager" ? "Admin" : user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 md:px-8 md:py-6 font-black text-right text-xl md:text-2xl text-[#DA291C]">
                    {user.total_points}
                  </td>
                  
                  {isManager && (
                    <td className="px-4 py-4 md:px-8 md:py-6 text-center">
                      <div className="flex items-center justify-center space-x-1 md:space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        
                        <select
                          key={`${user.id}-${user.role}`} 
                          defaultValue={user.role}
                          onChange={(e) => handleRoleChange(e, user)}
                          className="text-[9px] md:text-[10px] font-bold bg-white border border-gray-200 text-gray-700 rounded-lg px-1 py-2 md:px-2 uppercase cursor-pointer hover:border-gray-300 outline-none shadow-sm disabled:opacity-50 transition-colors max-w-[80px] md:max-w-none"
                        >
                          <option value="employee">Employee</option>
                          <option value="shift_leader">Shift Leader</option>
                          <option value="agm">AGM</option>
                        </select>

                        {userRole === "store_manager" && (
                          <div className="flex space-x-1">
                            <button onClick={() => handleOpenModal(user, false)} title="Deduct Points" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">-</button>
                            <button onClick={() => handleOpenModal(user, true)} title="Add Points" className="bg-[#DA291C] hover:bg-red-700 text-white font-bold w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">+</button>
                          </div>
                        )}
                        <button onClick={() => handleDelete(user)} title="Delete Employee" className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-red-600 font-bold w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm">✕</button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* LEADERSHIP SECTION - Mobile Padding */}
      {managers && managers.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100 p-5 md:p-8">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Leadership Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{manager.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{manager.role.replace('_', ' ')}</p>
                </div>
                {userRole === "area_manager" && (
                  <button 
                    onClick={() => handleDelete(manager)} 
                    title="Remove Manager" 
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 font-bold w-8 h-8 rounded-lg transition-all flex items-center justify-center text-xs border border-transparent hover:border-red-100"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE STACKED MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-sm border border-gray-100"
            >
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1 tracking-tight">
                {isAdding ? "Award Points" : "Deduct Points"}
              </h3>
              <p className="text-xs md:text-sm text-gray-500 mb-6 font-medium">
                Updating ledger for <span className="font-bold text-gray-900">{selectedUser.name}</span>
              </p>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Amount</label>
                    <select 
                      value={pointAmount} 
                      onChange={(e) => setPointAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white font-black text-lg outline-none transition-colors"
                    >
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-2/3">
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Reason</label>
                    <input 
                      type="text" 
                      required 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white font-medium outline-none transition-colors" 
                      placeholder="e.g., Deep cleaned" 
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition-colors text-sm md:text-base">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors shadow-md text-sm md:text-base ${isAdding ? 'bg-[#DA291C] hover:bg-red-700' : 'bg-gray-900 hover:bg-black'}`}>
                    {isSubmitting ? "Wait..." : "Confirm"}
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