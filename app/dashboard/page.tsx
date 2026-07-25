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
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) return;

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const role = formData.get("role")?.toString() || "employee";
    const targetStoreId = parseInt(formData.get("store_id")?.toString() || "1"); 
    
    if (currentRole === "store_manager" && (role === "store_manager" || role === "area_manager")) return; 
    
    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (name, email, password_hash, role, store_id) VALUES (${name}, ${email}, ${hash}, ${role}, ${targetStoreId})`;
    revalidatePath("/dashboard"); 
  }

  async function updatePoints(employeeId: string, pointsChange: number, reason: string) {
    "use server";
    const currentSession = await auth();
    const managerId = currentSession?.user?.id;
    const currentRole = currentSession?.user?.role as string;
    
    if (!managerId || currentRole !== "store_manager") return; 

    await sql`INSERT INTO points_log (employee_id, manager_id, points_changed, reason) VALUES (${employeeId}, ${managerId}, ${pointsChange}, ${reason})`;
    await sql`UPDATE users SET total_points = total_points + ${pointsChange} WHERE id = ${employeeId}`;
    revalidatePath("/dashboard");
  }

  async function deleteUser(targetId: string) {
    "use server";
    const currentSession = await auth();
    const currentRole = currentSession?.user?.role as string;
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) return;
    
    await sql`DELETE FROM points_log WHERE employee_id = ${targetId} OR manager_id = ${targetId}`;
    await sql`DELETE FROM users WHERE id = ${targetId}`;
    revalidatePath("/dashboard");
  }

  async function changeRole(targetId: string, newRole: string) {
    "use server";
    try {
      const currentSession = await auth();
      const currentRole = currentSession?.user?.role as string;
      
      if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) return { error: "Unauthorized." };
      if (currentRole === "store_manager" && (newRole === "store_manager" || newRole === "area_manager")) return { error: "Store managers cannot promote to this level." };

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
    
    if (!currentSession || (currentRole !== "area_manager" && currentRole !== "store_manager")) return;

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
    // PREMIUM AMBIENT BACKGROUND
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-gray-100 to-[#fdfdfd]">
      
      <nav className="bg-gradient-to-r from-[#DA291C] to-red-700 text-white shadow-lg border-b border-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="font-black text-xl tracking-tight drop-shadow-sm">FIVE GUYS</div>
            <div className="flex items-center space-x-6">
              <Link href={`/activity?store=${safeStoreId}`} className="text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider">Activity Feed</Link>
              <Link href="/dashboard/settings" className="text-sm font-bold hover:text-red-200 transition-colors uppercase tracking-wider">Settings</Link>
              <span className="text-sm font-medium hidden sm:block border-l pl-6 border-red-400 capitalize">
                {session.user?.name === "Admin Manager" ? "Admin Manager" : `${session.user?.name} (${userRole?.replace('_', ' ')})`}
              </span>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button type="submit" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-white hover:text-[#DA291C] transition-all">LOG OUT</button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {isAreaManager && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 drop-shadow-sm">Select Location</h3>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {allStores.map(store => {
                const isActive = store.id === safeStoreId;
                return (
                  <Link 
                    key={store.id} 
                    href={`/dashboard?store=${store.id}`}
                    className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm border 
                      ${isActive ? 'bg-gray-900 text-white shadow-xl transform scale-105 border-gray-800' : 'bg-white/60 backdrop-blur-md text-gray-700 hover:bg-white/90 border-white/80'}`}
                  >
                    {store.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight drop-shadow-sm">{activeStoreName}</h1>
        </div>

        <div className="space-y-8">
          
          {!isManager && employeeData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#DA291C] to-red-800 rounded-3xl shadow-[0_8px_40px_rgb(218,41,28,0.3)] p-8 text-white flex flex-col md:flex-row justify-between items-center border border-red-500/50">
                <div className="mb-4 md:mb-0 text-center md:text-left">
                  <h2 className="text-3xl font-black tracking-tight mb-2 drop-shadow-md">Welcome back, {employeeData.name.split(' ')[0]}!</h2>
                  <p className="text-red-100 font-medium text-lg">Keep up the great work on your shifts.</p>
                </div>
                <div className="flex space-x-8 text-center md:text-right">
                  <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur-md border border-white/20 shadow-inner">
                    <p className="text-xs font-bold text-red-100 uppercase tracking-wider mb-1">Your Rank</p>
                    <p className="text-5xl font-black drop-shadow-md">#{employeeRank}</p>
                  </div>
                  <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur-md border border-white/20 shadow-inner">
                    <p className="text-xs font-bold text-red-100 uppercase tracking-wider mb-1">Total Points</p>
                    <p className="text-5xl font-black drop-shadow-md">{employeeData.total_points}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8">
                <h3 className="text-xl font-black text-gray-900 mb-6 drop-shadow-sm">Your Recent Point History</h3>
                {employeeHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm font-medium">No points awarded yet. Time to get on the board!</p>
                ) : (
                  <div className="divide-y divide-white/60">
                    {employeeHistory.map(log => (
                      <div key={log.id} className="py-4 flex justify-between items-center group hover:bg-white/50 px-4 rounded-2xl transition-all">
                        <div>
                          <p className="text-base font-bold text-gray-900 drop-shadow-sm">{log.reason}</p>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Awarded by {log.manager_name}</p>
                        </div>
                        <div className={`font-black text-2xl drop-shadow-sm ${log.points_changed > 0 ? 'text-[#DA291C]' : 'text-gray-800'}`}>
                          {log.points_changed > 0 ? '+' : ''}{log.points_changed}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isManager && (
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8">
              <h3 className="text-xl font-black text-gray-900 mb-6 drop-shadow-sm">Add Team Member to {activeStoreName}</h3>
              <form action={addEmployee} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <input type="hidden" name="store_id" value={safeStoreId} />
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Name</label>
                  <input type="text" name="name" required className="w-full px-5 py-4 border-2 border-white/60 rounded-2xl focus:border-[#DA291C] text-gray-900 bg-white/50 backdrop-blur-md outline-none transition-all shadow-inner" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Email</label>
                  <input type="email" name="email" required className="w-full px-5 py-4 border-2 border-white/60 rounded-2xl focus:border-[#DA291C] text-gray-900 bg-white/50 backdrop-blur-md outline-none transition-all shadow-inner" placeholder="jane@fiveguys.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Password</label>
                  <input type="password" name="password" required className="w-full px-5 py-4 border-2 border-white/60 rounded-2xl focus:border-[#DA291C] text-gray-900 bg-white/50 backdrop-blur-md outline-none transition-all shadow-inner" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Role</label>
                  <select name="role" className="w-full px-5 py-4 border-2 border-white/60 rounded-2xl focus:border-[#DA291C] text-gray-900 bg-white/50 backdrop-blur-md outline-none transition-all shadow-inner uppercase text-sm font-bold">
                    <option value="employee">Employee</option>
                    <option value="shift_leader">Shift Leader</option>
                    <option value="agm">AGM</option>
                    {isAreaManager && <option value="store_manager">Store Manager</option>}
                  </select>
                </div>
                <button type="submit" className="bg-gray-900 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-black h-[58px]">
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
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-sm p-4">
               <StoreManager 
                 storeId={safeStoreId} 
                 storeName={activeStoreName} 
                 addStore={addStore} 
                 deleteStore={deleteStore} 
               />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}