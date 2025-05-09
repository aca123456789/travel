import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { getAdminUser } from "~/services/admin.server";
import { ReactNode, useState } from "react";
import { IoLogOutOutline, IoMenuOutline, IoCloseOutline } from "react-icons/io5";
import { MdDashboard, MdAdminPanelSettings } from "react-icons/md";
import clsx from "clsx";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getAdminUser(request);
  return json({ user });
};

function NavLink({
  to,
  children,
  active = false,
}: {
  to: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
        active
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-gray-600 hover:bg-gray-100"
      )}
      prefetch="intent"
    >
      {children}
    </Link>
  );
}

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {user && (
        <header className="w-full bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <IoCloseOutline size={24} /> : <IoMenuOutline size={24} />}
              </button>
              <Link to="/admin" className="flex items-center gap-2">
                <MdAdminPanelSettings className="text-indigo-600 text-2xl" />
                <h1 className="text-xl font-bold text-gray-800">旅游日记管理系统</h1>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
                  {user?.name?.[0] || "?"}
                </div>
                <div className="hidden md:block">
                  <p className="font-medium text-gray-900">{user?.name || "未登录"}</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === "admin" ? "管理员" : "审核员"}
                  </p>
                </div>
              </div>
              <Link
                to="/admin/logout"
                className="flex items-center gap-2 text-red-600 px-3 py-2 rounded-md hover:bg-red-50"
              >
                <IoLogOutOutline size={20} />
                <span className="hidden md:inline">退出登录</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {user && (
          <aside 
            className={clsx(
              "bg-white border-r border-gray-200 z-20 transition-all duration-300",
              "fixed md:static inset-y-0 left-0 w-64 transform",
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="mb-8">
                {/* 移动端显示的标题，桌面端已在顶部显示 */}
                <div className="md:hidden mb-8 mt-2">
                  <h2 className="text-xl font-bold text-gray-800">管理菜单</h2>
                </div>
                
                <nav className="space-y-2">
                  <NavLink to="/admin" active={isActive("/admin")}>
                    <MdDashboard className="text-xl" />
                    <span>游记审核管理</span>
                  </NavLink>
                </nav>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-auto relative p-6">
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setMobileMenuOpen(false);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="关闭菜单"
            />
          )}
          <div className="mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
} 
