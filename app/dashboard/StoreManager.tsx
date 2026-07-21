"use client";

import { useState } from "react";

export default function StoreManager({
  storeId,
  storeName,
  addStore,
  deleteStore
}: {
  storeId: number;
  storeName: string;
  addStore: (formData: FormData) => Promise<void>;
  deleteStore: (storeId: number) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`DANGER: Are you sure you want to permanently delete ${storeName} and all of its employees? This will erase all their points and cannot be undone.`)) {
      setIsDeleting(true);
      await deleteStore(storeId);
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-gray-900 mt-8">
      <h3 className="text-lg font-black text-gray-900 mb-4">Store Management</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
        {/* ADD NEW STORE */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 uppercase mb-2">Create New Location</h4>
          <form action={addStore} className="flex space-x-2">
            <input 
              type="text" 
              name="storeName" 
              required 
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-md focus:border-[#DA291C] text-gray-900 font-bold" 
              placeholder="e.g., Calgary Downtown" 
            />
            <button type="submit" className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md">
              + ADD STORE
            </button>
          </form>
        </div>

        {/* DELETE CURRENT STORE */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 uppercase mb-2 text-red-600">Danger Zone</h4>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-200 font-bold py-2 px-4 rounded-md transition-colors shadow-sm"
          >
            {isDeleting ? "Deleting..." : `Delete ${storeName}`}
          </button>
        </div>
      </div>
    </div>
  );
}