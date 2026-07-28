import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";
import { sql } from "../../lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import ResetButton from "./ResetButton"; // <-- Safely imported Client button

// Strict TypeScript Interfaces for the database
type AuditLog = {
  id: string;
  employee_name: string;
  manager_name: string;
  points_changed: number;
  reason: string;
  created_at: Date | null;
};

type Store = { id: number; name: string };

interface ActivityFeedProps {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ActivityFeedPage(props: ActivityFeedProps) {
  const searchParams = await props.searchParams;

  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const userRole = session.user.role as string;
  const isAreaManager = userRole === "area_manager";
  
  // SECURE ADMIN CHECK
  const isAdmin = session.user.name === "Admin Manager"; 

  const allStores = (await sql`SELECT * FROM stores ORDER BY id`) as Store[];

  let activeStoreId = session.user.store_id; 

  if (isAreaManager) {
    const storeQuery = searchParams?.store;
    const parsedStoreId = typeof storeQuery === "string" ? parseInt(storeQuery) : undefined;
    activeStoreId = parsedStoreId || allStores[0]?.id;
  }

  if (!activeStoreId && allStores.length > 0) {
    activeStoreId = allStores[0].id;
  }
  const safeStoreId = activeStoreId || 1;

  const activeStoreName = allStores.find(s => s.id === safeStoreId)?.name || "Unknown Store";

  // THE SECURE SERVER ACTION
  async function clearStoreActivity(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (currentSession?.user?.name !== "Admin Manager") return; 

    const targetStoreId = formData.get("storeId");

    if (targetStoreId) {
      await sql`
        DELETE FROM points_log 
        WHERE employee_id IN (SELECT id FROM users WHERE store_id = ${targetStoreId})
      `;
      revalidatePath("/activity");
    }
  }

  const logs = (await sql`
    SELECT 
      points_log.id,
      points_log.points_changed,
      points_log.reason,
      points_log.created_at,
      employee.name AS employee_name,
      manager.name AS manager_name
    FROM points_log
    JOIN users AS employee ON points_log.employee_id = employee.id
    JOIN users AS manager ON points_log.manager_id = manager.id
    WHERE employee.store_id = ${safeStoreId}
    ORDER BY points_log.created_at DESC
    LIMIT 50
  `) as AuditLog[];

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* NAVBAR */}
      <nav className="bg-[#DA291C] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="font-black text-xl tracking-tight">FIVE GUYS</div>
            <div className="flex items-center space-x-6">
              <Link href={`/dashboard?store=${safeStoreId}`} className="text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider">
                ← Dashboard
              </Link>
              
              <Link href="/dashboard/settings" className="text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider hidden sm:block">
                Settings
              </Link>

              <span className="text-sm font-medium hidden md:block border-l pl-6 border-red-400 capitalize">
                {session.user?.name === "Admin Manager" ? "Admin Manager" : `${session.user?.name} (${userRole?.replace('_', ' ')})`}
              </span>

              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button type="submit" className="bg-white text-[#DA291C] px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors">
                  LOG OUT
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        
        {isAreaManager && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Location</h3>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {allStores.map(store => {
                const isActive = store.id === safeStoreId;
                return (
                  <Link 
                    key={store.id} 
                    href={`/activity?store=${store.id}`}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm 
                      ${isActive ? 'bg-gray-900 text-white shadow-md transform scale-105' : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'}`}
                  >
                    {store.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border-t-8 border-gray-900">
          <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Activity: {activeStoreName}
            </h2>
            
            <div className="flex items-center gap-3">
              {/* ADMIN ONLY RESET BUTTON (Safely injected as a client component) */}
              {isAdmin && (
                <ResetButton storeId={safeStoreId} clearStoreActivity={clearStoreActivity} />
              )}
              
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Recent Actions
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 font-medium py-8">No point changes have been logged for this store yet.</p>
            ) : (
              <div className="space-y-6">
                {logs.map((log) => {
                  const isPositive = log.points_changed > 0;
                  
                  const safeDate = log.created_at ? new Date(log.created_at) : new Date();
                  
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Edmonton'
                  }).format(safeDate);
                  
                  const formattedTime = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'America/Edmonton'
                  }).format(safeDate);

                  return (
                    <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? '+' : ''}{log.points_changed}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>{formattedDate}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{formattedTime}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {log.employee_name}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 italic">
                          "{log.reason}"
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-wide">
                          Logged by {log.manager_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}