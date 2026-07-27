"use client";

import { useState } from "react";

type PointLog = { 
  id: number; 
  points_changed: number; 
  reason: string; 
  manager_name: string 
};

export default function RecentHistory({ history }: { history: PointLog[] }) {
  // Start by showing only 3 items
  const [visibleCount, setVisibleCount] = useState(3);

  if (history.length === 0) {
    return (
      <p className="text-gray-500 text-sm font-medium">
        No points awarded yet. Time to get on the board!
      </p>
    );
  }

  // Slice the array to only show the currently visible amount
  const visibleHistory = history.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;
  
  // We can show "Show Less" if they have expanded the list past 3
  const canShowLess = visibleCount > 3;

  return (
    <div>
      <div className="divide-y divide-gray-200">
        {visibleHistory.map(log => (
          <div key={log.id} className="py-3 flex justify-between items-center group hover:bg-gray-50 px-2 rounded transition-colors">
            <div>
              <p className="text-sm font-bold text-gray-900">{log.reason}</p>
              <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
                Awarded by {log.manager_name}
              </p>
            </div>
            <div className={`font-black text-lg md:text-xl ${log.points_changed > 0 ? 'text-[#DA291C]' : 'text-gray-800'}`}>
              {log.points_changed > 0 ? '+' : ''}{log.points_changed}
            </div>
          </div>
        ))}
      </div>
      
      {/* The Dynamic Buttons */}
      <div className="mt-4 flex gap-3">
        {canShowLess && (
          <button
            onClick={() => setVisibleCount(3)}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl border-2 border-gray-200 transition-colors text-xs uppercase tracking-widest shadow-sm"
          >
            Show Less
          </button>
        )}
        
        {hasMore && (
          <button
            onClick={() => setVisibleCount(prev => prev + 3)}
            className="flex-1 bg-white hover:bg-red-50 text-[#DA291C] font-bold py-3 rounded-xl border-2 border-red-100 transition-colors text-xs uppercase tracking-widest shadow-sm"
          >
            Load More...
          </button>
        )}
      </div>

      {!hasMore && history.length > 3 && (
        <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest mt-4">
          End of History
        </p>
      )}
    </div>
  );
}