import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";
import { sql } from "../../lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import InteractiveLeaderboard from "./InteractiveLeaderboard";
import StoreManager from "./StoreManager";
import Link from "next/link";

type LeaderboardUser = { id: string; name: string; role: string; total_points: number };
type Store = { id: number; name: string };
type PointLog = { id: number; points_changed: number; reason: string; manager_name: string };

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function DashboardPage(props: DashboardProps) {
  const searchParams = await props.searchParams; 
  
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const userId = session.user.id as string;
  const userRole = session.user.role as string;
  const isAreaManager = userRole === "area_manager";
  const isStoreManager = userRole === "store_manager";
  const isManager = isAreaManager || isStoreManager;

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
  const activeStoreName = allStores.find(s => s.id === activeStoreId)?.name || "Unknown Store";

  async function addEmployee(formData: FormData) {
    "use server";
    const currentSession = await auth();
    const currentRole = currentSession?.user?.role as string;
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) {
      return;
    }

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const role = formData.get("role")?.toString() || "employee";
    const targetStoreId = parseInt(formData.get("store_id")?.toString() || "1"); 
    
    if (currentRole === "store_manager" && (role === "store_manager" || role === "area_manager")) {
      return; 
    }
    
    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (name, email, password_hash, role, store_id) VALUES (${name}, ${email}, ${hash}, ${role}, ${targetStoreId})`;
    revalidatePath("/dashboard"); 
  }

  async function updatePoints(employeeId: string, pointsChange: number, reason: string) {
    "use server";
    const currentSession = await auth();
    const managerId = currentSession?.user?.id;
    const currentRole = currentSession?.user?.role as string;
    
    if (!managerId || currentRole !== "store_manager") {
      return; 
    }

    await sql`INSERT INTO points_log (employee_id, manager_id, points_changed, reason) VALUES (${employeeId}, ${managerId}, ${pointsChange}, ${reason})`;
    await sql`UPDATE users SET total_points = total_points + ${pointsChange} WHERE id = ${employeeId}`;
    revalidatePath("/dashboard");
  }

  async function deleteUser(targetId: string) {
    "use server";
    const currentSession = await auth();
    const currentRole = currentSession?.user?.role as string;
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) {
      return;
    }
    
    await sql`DELETE FROM points_log WHERE employee_id = ${targetId} OR manager_id = ${targetId}`;
    await sql`DELETE FROM users WHERE id = ${targetId}`;
    revalidatePath("/dashboard");
  }

  async function changeRole(targetId: string, newRole: string) {
    "use server";
    try {
      const currentSession = await auth();
      const currentRole = currentSession?.user?.role as string;
      
      if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) {
        return { error: "Unauthorized." };
      }

      if (currentRole === "store_manager" && (newRole === "store_manager" || newRole === "area_manager")) {
        return { error: "Store managers cannot promote to this level." };
      }

      await sql`UPDATE users SET role = ${newRole} WHERE id = ${targetId}`;
      revalidatePath("/dashboard");
      return { success: true };
    } catch (error: any) {
      console.error("Database error while changing role:", error);
      return { error: "The database rejected this role change. Check your Neon column restrictions." };
    }
  }

  async function resetPoints(targetStoreId: number) {
    "use server";
    const currentSession = await auth();
    const currentRole = currentSession?.user?.role as string;
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) {
      return;
    }

    await sql`UPDATE users SET total_points = 0 WHERE store_id = ${targetStoreId}`;
    revalidatePath("/dashboard");
  }

  async function addStore(formData: FormData) {
    "use server";
    const currentSession = await auth();
    
    if (currentSession?.user?.role !== "area_manager") return;
    
    const storeName = formData.get("storeName")?.toString();
    if (!storeName) return;

    await sql`INSERT INTO stores (name) VALUES (${storeName})`;
    revalidatePath("/dashboard");
  }

  async function deleteStore(targetStoreId: number) {
    "use server";
    const currentSession = await auth();
    
    if (currentSession?.user?.role !== "area_manager") return;

    const allStoresResult = await sql`SELECT id FROM stores`;
    if (allStoresResult.length <= 1) return;

    const safeStoreId = allStoresResult.find(s => s.id !== targetStoreId)?.id;
    await sql`UPDATE users SET store_id = ${safeStoreId} WHERE store_id = ${targetStoreId} AND role = 'area_manager'`;

    await sql`DELETE FROM points_log WHERE employee_id IN (SELECT id FROM users WHERE store_id = ${targetStoreId})`;
    await sql`DELETE FROM users WHERE store_id = ${targetStoreId}`;
    await sql`DELETE FROM stores WHERE id = ${targetStoreId}`;

    revalidatePath("/dashboard");
    redirect("/dashboard"); 
  }

  const leaderboard = (await sql`
    SELECT id, name, role, total_points 
    FROM users 
    WHERE store_id = ${safeStoreId} AND role NOT IN ('store_manager', 'area_manager')
    ORDER BY total_points DESC
  `) as LeaderboardUser[];

  const storeManagers = (await sql`
    SELECT id, name, role, total_points 
    FROM users 
    WHERE store_id = ${safeStoreId} AND role = 'store_manager'
    ORDER BY name ASC
  `) as LeaderboardUser[];

  let employeeHistory: PointLog[] = [];
  if (!isManager) {
    employeeHistory = (await sql`
      SELECT p.id, p.points_changed, p.reason, u.name as manager_name 
      FROM points_log p 
      JOIN users u ON p.manager_id = u.id 
      WHERE p.employee_id = ${userId} 
      ORDER BY p.id DESC 
      LIMIT 10
    `) as PointLog[];
  }

  const employeeRankIndex = leaderboard.findIndex(u => u.id === userId);
  const employeeData = employeeRankIndex !== -1 ? leaderboard[employeeRankIndex] : null;
  const employeeRank = employeeRankIndex !== -1 ? employeeRankIndex + 1 : null;

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      
      {/* MOBILE OPTIMIZED NAVBAR */}
      <nav className="bg-[#DA291C] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="font-black text-lg md:text-xl tracking-tight">FIVE GUYS</div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Link href={`/activity?store=${safeStoreId}`} className="text-[10px] sm:text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider hidden sm:block">Activity</Link>
              <Link href="/dashboard/settings" className="text-[10px] sm:text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider">Settings</Link>
              <span className="text-sm font-medium hidden md:block border-l pl-6 border-red-400 capitalize">
                {session.user?.name === "Admin Manager" ? "Admin Manager" : `${session.user?.name} (${userRole?.replace('_', ' ')})`}
              </span>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button type="submit" className="bg-white text-[#DA291C] px-3 py-1.5 md:px-4 md:py-2 rounded-md text-[10px] sm:text-sm font-bold shadow-sm hover:bg-gray-100 transition-colors">LOG OUT</button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 md:py-10 px-4 sm:px-6 lg:px-8">
        
        {isAreaManager && (
          <div className="mb-6 md:mb-8">
            <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Location</h3>
            <div className="flex space-x-2 md:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
              {allStores.map(store => {
                const isActive = store.id === safeStoreId;
                return (
                  <Link 
                    key={store.id} 
                    href={`/dashboard?store=${store.id}`}
                    className={`px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm border 
                      ${isActive ? 'bg-gray-900 text-white shadow-md transform scale-105 border-transparent' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'}`}
                  >
                    {store.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{activeStoreName}</h1>
        </div>

        <div className="space-y-6 md:space-y-8">
          
          {/* MOBILE OPTIMIZED WELCOME CARD */}
          {!isManager && employeeData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl shadow-lg p-5 md:p-6 text-white flex flex-col md:flex-row justify-between items-center border-b-4 border-gray-900">
                <div className="mb-6 md:mb-0 text-center md:text-left w-full">
                  <h2 className="text-2xl font-black tracking-tight mb-1">Welcome back, {employeeData.name.split(' ')[0]}!</h2>
                  <p className="text-red-100 font-medium text-sm md:text-base">Keep up the great work on your shifts.</p>
                </div>
                <div className="flex w-full md:w-auto justify-center space-x-4 md:space-x-8 text-center md:text-right">
                  <div className="bg-white/10 rounded-lg px-4 py-3 md:py-2 backdrop-blur-sm flex-1 md:flex-none">
                    <p className="text-[10px] md:text-xs font-bold text-red-200 uppercase tracking-wider mb-1">Your Rank</p>
                    <p className="text-3xl md:text-4xl font-black">#{employeeRank}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-4 py-3 md:py-2 backdrop-blur-sm flex-1 md:flex-none">
                    <p className="text-[10px] md:text-xs font-bold text-red-200 uppercase tracking-wider mb-1">Total Points</p>
                    <p className="text-3xl md:text-4xl font-black">{employeeData.total_points}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-6">
                <h3 className="text-lg font-black text-gray-900 mb-4">Your Recent Point History</h3>
                {employeeHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm font-medium">No points awarded yet. Time to get on the board!</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {employeeHistory.map(log => (
                      <div key={log.id} className="py-3 flex justify-between items-center group hover:bg-gray-50 px-2 rounded transition-colors">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{log.reason}</p>
                          <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Awarded by {log.manager_name}</p>
                        </div>
                        <div className={`font-black text-lg md:text-xl ${log.points_changed > 0 ? 'text-[#DA291C]' : 'text-gray-800'}`}>
                          {log.points_changed > 0 ? '+' : ''}{log.points_changed}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MOBILE OPTIMIZED ADD USER FORM */}
          {isManager && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-6">
              <h3 className="text-lg font-black text-gray-900 mb-4">Add Team Member to {activeStoreName}</h3>
              <form action={addEmployee} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start md:items-end">
                <input type="hidden" name="store_id" value={safeStoreId} />
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Name</label>
                  <input type="text" name="name" required className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white outline-none transition-colors" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Email</label>
                  <input type="email" name="email" required className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white outline-none transition-colors" placeholder="jane@fiveguys.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Password</label>
                  <input type="password" name="password" required className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white outline-none transition-colors" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Role</label>
                  <select name="role" className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#DA291C] text-gray-900 bg-white outline-none transition-colors uppercase text-sm font-bold">
                    <option value="employee">Employee</option>
                    <option value="shift_leader">Shift Leader</option>
                    <option value="agm">AGM</option>
                    {isAreaManager && <option value="store_manager">Store Manager</option>}
                  </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-gray-900 text-white font-bold py-3 px-4 rounded-xl transition-colors hover:bg-black h-[52px]">
                  + ADD USER
                </button>
              </form>
            </div>
          )}

          <InteractiveLeaderboard 
            leaderboard={leaderboard} 
            managers={storeManagers} 
            userRole={userRole} 
            updatePoints={updatePoints} 
            deleteUser={deleteUser}
            resetPoints={resetPoints}
            storeId={safeStoreId}
            changeRole={changeRole} 
          />

          {isAreaManager && (
            <StoreManager 
              storeId={safeStoreId} 
              storeName={activeStoreName} 
              addStore={addStore} 
              deleteStore={deleteStore} 
            />
          )}

        </div>
      </main>
    </div>
  );
}