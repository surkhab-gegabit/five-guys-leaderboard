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
    return <span className="text-gray-400 font-black">#{index + 1}</span>;
  };

  return (
    // PREMIUM GLASS CONTAINER
    <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden border border-white/80 transition-all relative">
      
      {/* HEADER */}
      <div className="px-8 py-8 border-b border-white/60 flex justify-between items-center bg-white/40">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase drop-shadow-sm">
          Leaderboard
        </h2>
        {isManager && (
          <button 
            onClick={handleReset} 
            disabled={isResetting}
            className="text-xs font-bold bg-white/80 text-gray-600 px-5 py-2.5 rounded-xl hover:bg-white hover:text-gray-900 hover:shadow-md transition-all uppercase tracking-widest disabled:opacity-50 border border-white/50 backdrop-blur-md"
          >
            {isResetting ? "Resetting..." : "Reset All Points"}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/5 text-gray-500 text-[11px] uppercase tracking-widest border-b border-white/60">
              <th className="px-8 py-5 font-black w-24">Rank</th>
              <th className="px-8 py-5 font-black">Crew Member</th>
              <th className="px-8 py-5 font-black">Position</th>
              <th className="px-8 py-5 font-black text-right">Score</th>
              {isManager && <th className="px-8 py-5 font-black text-center">Manage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 bg-transparent">
            <AnimatePresence>
              {leaderboard.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={5} className="px-8 py-16 text-center text-gray-500 font-medium tracking-wide">
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
                  className="hover:bg-white/50 transition-colors group"
                >
                  <td className="px-8 py-6 text-3xl font-black">{getBadge(index)}</td>
                  <td className="px-8 py-6 font-black text-gray-900 tracking-tight text-lg drop-shadow-sm">{user.name}</td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/70 text-gray-700 capitalize uppercase tracking-widest shadow-sm border border-white/80">
                      {user.role === "area_manager" ? "Admin" : user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-black text-right text-2xl text-[#DA291C] drop-shadow-sm">
                    {user.total_points}
                  </td>
                  
                  {isManager && (
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        <select
                          key={`${user.id}-${user.role}`} 
                          defaultValue={user.role}
                          onChange={(e) => handleRoleChange(e, user)}
                          className="text-[10px] font-bold bg-white/80 backdrop-blur-md border border-white/60 text-gray-700 rounded-xl px-3 py-2 uppercase cursor-pointer hover:bg-white outline-none shadow-sm disabled:opacity-50 transition-colors"
                        >
                          <option value="employee">Employee</option>
                          <option value="shift_leader">Shift Leader</option>
                          <option value="agm">AGM</option>
                        </select>

                        {userRole === "store_manager" && (
                          <div className="flex space-x-1">
                            <button onClick={() => handleOpenModal(user, false)} title="Deduct Points" className="bg-white/80 backdrop-blur-md border border-white/60 hover:bg-white text-gray-700 font-bold w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm hover:shadow-md">-</button>
                            <button onClick={() => handleOpenModal(user, true)} title="Add Points" className="bg-gradient-to-b from-[#DA291C] to-red-700 text-white font-bold w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg border border-red-500">+</button>
                          </div>
                        )}
                        <button onClick={() => handleDelete(user)} title="Delete Employee" className="bg-white/80 backdrop-blur-md border border-white/60 hover:bg-white text-gray-400 hover:text-[#DA291C] font-bold w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm hover:shadow-md">✕</button>
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
        <div className="bg-white/30 border-t border-white/60 p-8">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
            Leadership Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                <div>
                  <p className="font-bold text-gray-900 text-sm drop-shadow-sm">{manager.name}</p>
                  <p className="text-[10px] font-bold text-[#DA291C] uppercase tracking-widest mt-0.5">{manager.role.replace('_', ' ')}</p>
                </div>
                {userRole === "area_manager" && (
                  <button 
                    onClick={() => handleDelete(manager)} 
                    title="Remove Manager" 
                    className="opacity-0 group-hover:opacity-100 bg-white hover:bg-red-50 hover:text-[#DA291C] text-gray-400 font-bold w-8 h-8 rounded-xl transition-all flex items-center justify-center text-xs shadow-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ULTRA PREMIUM GLASS MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white/85 backdrop-blur-3xl rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-white"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight drop-shadow-sm">
                {isAdding ? "Award Points" : "Deduct Points"}
              </h3>
              <p className="text-sm text-gray-600 mb-6 font-medium">
                Updating ledger for <span className="font-bold text-gray-900">{selectedUser.name}</span>
              </p>
              <form onSubmit={handleSubmit}>
                <div className="flex space-x-4 mb-6">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Amount</label>
                    <select 
                      value={pointAmount} 
                      onChange={(e) => setPointAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-white/50 bg-white/50 backdrop-blur-md rounded-2xl focus:border-[#DA291C] text-gray-900 font-black text-lg outline-none transition-all shadow-inner"
                    >
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Reason</label>
                    <input 
                      type="text" 
                      required 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      className="w-full px-4 py-3 border-2 border-white/50 bg-white/50 backdrop-blur-md rounded-2xl focus:border-[#DA291C] text-gray-900 font-medium outline-none transition-all shadow-inner" 
                      placeholder="e.g., Deep cleaned" 
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 bg-white/60 backdrop-blur-md border border-white hover:bg-white text-gray-700 font-bold py-3 rounded-2xl transition-all shadow-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className={`flex-1 text-white font-bold py-3 rounded-2xl transition-all shadow-lg hover:shadow-xl ${isAdding ? 'bg-gradient-to-b from-[#DA291C] to-red-700 border border-red-500' : 'bg-gradient-to-b from-gray-800 to-black border border-gray-700'}`}>
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