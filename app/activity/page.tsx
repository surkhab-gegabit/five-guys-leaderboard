import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { sql } from "../../lib/db";
import Link from "next/link";

// Strict TypeScript Interfaces for the database
type AuditLog = {
  id: string;
  employee_name: string;
  manager_name: string;
  points_changed: number;
  reason: string;
};

type Store = { id: number; name: string };

// Next.js standard interface for reading URL search parameters (like ?store=2)
interface ActivityFeedProps {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ActivityFeedPage(props: ActivityFeedProps) {
  // 1. Await URL parameters safely
  const searchParams = await props.searchParams;

  // 2. Verify login and roles
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const userRole = session.user.role as string;
  const isAreaManager = userRole === "area_manager";
  const isStoreManager = userRole === "store_manager";
  const isManager = isAreaManager || isStoreManager;

  // STRICT SECURITY: Block regular employees
  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center border-t-8 border-[#DA291C]">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6 font-medium">Only store managers can view the audit logs.</p>
          <Link href="/dashboard" className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Fetch stores to build the Area Manager menu
  const allStores = (await sql`SELECT * FROM stores ORDER BY id`) as Store[];

  // 4. Determine active store securely
  let activeStoreId = session.user.store_id; 

  if (isAreaManager) {
    // Safely parse the store ID from the URL
    const storeQuery = searchParams?.store;
    const parsedStoreId = typeof storeQuery === "string" ? parseInt(storeQuery) : undefined;
    activeStoreId = parsedStoreId || allStores[0]?.id;
  }

  // Fallback in case a manager has no store assigned yet
  if (!activeStoreId && allStores.length > 0) {
    activeStoreId = allStores[0].id;
  }

  const activeStoreName = allStores.find(s => s.id === activeStoreId)?.name || "Unknown Store";

  // 5. DATABASE QUERY: Fetch logs ONLY for the active store
  const logs = (await sql`
    SELECT 
      points_log.id,
      points_log.points_changed,
      points_log.reason,
      employee.name AS employee_name,
      manager.name AS manager_name
    FROM points_log
    JOIN users AS employee ON points_log.employee_id = employee.id
    JOIN users AS manager ON points_log.manager_id = manager.id
    WHERE employee.store_id = ${activeStoreId}
    ORDER BY points_log.id DESC
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
              {/* Dynamic link so returning to the dashboard remembers the store you were looking at */}
              <Link href={`/dashboard?store=${activeStoreId}`} className="text-sm font-bold hover:text-red-200 transition-colors">
                ← Back to Leaderboard
              </Link>
              <span className="text-sm font-medium hidden sm:block border-l pl-6 border-red-400">
                {session.user?.name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        
        {/* AREA MANAGER CONTROLS: The Store Tabs */}
        {isAreaManager && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Location</h3>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {allStores.map(store => {
                const isActive = store.id === activeStoreId;
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
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Recent Actions
            </span>
          </div>
          
          <div className="p-6">
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 font-medium py-8">No point changes have been logged for this store yet.</p>
            ) : (
              <div className="space-y-6">
                {logs.map((log) => {
                  const isPositive = log.points_changed > 0;
                  return (
                    <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? '+' : ''}{log.points_changed}
                      </div>
                      <div className="flex-1 min-w-0">
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