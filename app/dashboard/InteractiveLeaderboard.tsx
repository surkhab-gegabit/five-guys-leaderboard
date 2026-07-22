"use client";

import { useState } from "react";

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
  changeRole: (userId: string, newRole: string) => Promise<void>
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(true);
  const [pointAmount, setPointAmount] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isManager = userRole === "area_manager" || userRole === "store_manager";

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
    setIsSubmitting(false);
    setSelectedUser(null);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset ALL points for this store back to 0? This starts a new month and cannot be undone.")) {
      setIsResetting(true);
      await resetPoints(storeId);
      setIsResetting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to completely remove ${user.name}? This will also delete their points history.`)) {
      await deleteUser(user.id);
    }
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    const formattedRole = newRole.replace('_', ' ');
    if (window.confirm(`Are you sure you want to change ${user.name}'s role to ${formattedRole}?`)) {
      await changeRole(user.id, newRole);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-t-8 border-[#DA291C] relative">
      
      {/* MAIN LEADERBOARD SECTION */}
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Employee Leaderboard</h2>
        {isManager && (
          <button 
            onClick={handleReset} 
            disabled={isResetting}
            className="text-xs font-bold bg-red-50 text-red-700 px-4 py-2 rounded-md hover:bg-red-100 transition-colors uppercase tracking-wider"
          >
            {isResetting ? "Resetting..." : "Reset All Points"}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-bold border-b">Rank</th>
              <th className="px-6 py-4 font-bold border-b">Name</th>
              <th className="px-6 py-4 font-bold border-b">Role</th>
              <th className="px-6 py-4 font-bold border-b text-right">Points</th>
              {isManager && <th className="px-6 py-4 font-bold border-b text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">No employees added to this store yet.</td>
              </tr>
            )}
            {leaderboard.map((user, index) => (
              <tr key={user.id} className="hover:bg-red-50 transition-colors group">
                <td className="px-6 py-4 font-black text-gray-400">#{index + 1}</td>
                <td className="px-6 py-4 font-bold text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-500 capitalize">
                  {user.role === "area_manager" ? "Admin" : user.role.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 font-black text-[#DA291C] text-right text-lg">{user.total_points}</td>
                
                {isManager && (
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="text-[10px] font-bold bg-gray-100 border-none text-gray-700 rounded-md px-2 py-1.5 uppercase cursor-pointer hover:bg-gray-200 outline-none shadow-sm"
                      >
                        <option value="employee">Employee</option>
                        <option value="shift_leader">Shift Leader</option>
                        <option value="agm">AGM</option>
                      </select>

                      {userRole === "store_manager" && (
                        <>
                          <button onClick={() => handleOpenModal(user, false)} title="Deduct Points" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold w-8 h-8 rounded-full shadow-sm flex items-center justify-center">-</button>
                          <button onClick={() => handleOpenModal(user, true)} title="Add Points" className="bg-[#DA291C] hover:bg-red-700 text-white font-bold w-8 h-8 rounded-full shadow-sm flex items-center justify-center">+</button>
                        </>
                      )}
                      <button onClick={() => handleDelete(user)} title="Delete Employee" className="bg-gray-800 hover:bg-black text-white font-bold w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* STORE MANAGEMENT TEAM SECTION */}
      {managers && managers.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Store Management Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white border-2 border-gray-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{manager.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{manager.role.replace('_', ' ')}</p>
                </div>
                {userRole === "area_manager" && (
                  <button 
                    onClick={() => handleDelete(manager)} 
                    title="Remove Manager" 
                    className="bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 font-bold w-7 h-7 rounded-full transition-colors flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POINTS MODAL */}
      {selectedUser && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 rounded-xl">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              {isAdding ? "Add Points" : "Deduct Points"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Adjusting points for <span className="font-bold text-gray-900">{selectedUser.name}</span>
            </p>
            <form onSubmit={handleSubmit}>
              <div className="flex space-x-4 mb-4">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Amount</label>
                  <select 
                    value={pointAmount} 
                    onChange={(e) => setPointAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] text-gray-900 bg-white font-bold"
                  >
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                  </select>
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Reason</label>
                  <input type="text" required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] text-gray-900" placeholder="e.g., Deep cleaned" />
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 text-white font-bold py-2 rounded-md transition-colors shadow-md ${isAdding ? 'bg-[#DA291C] hover:bg-red-700' : 'bg-gray-900 hover:bg-black'}`}>{isSubmitting ? "Saving..." : "Confirm"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}