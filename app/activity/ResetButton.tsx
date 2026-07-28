"use client";

export default function ResetButton({ 
  storeId, 
  clearStoreActivity 
}: { 
  storeId: number, 
  clearStoreActivity: (formData: FormData) => Promise<void> 
}) {
  return (
    <form 
      action={clearStoreActivity} 
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete ALL activity logs for this store? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="storeId" value={storeId} />
      <button type="submit" className="bg-red-50 text-[#DA291C] text-xs font-black px-4 py-2 rounded-lg border-2 border-red-100 hover:bg-red-100 transition-colors uppercase tracking-widest shadow-sm">
        ⚠️ Reset Feed
      </button>
    </form>
  );
}