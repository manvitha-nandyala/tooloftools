import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

function navClassName({ isActive }: { isActive: boolean }) {
  return `rounded px-3 py-2 text-sm ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"}`;
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Link to="/catalog" className="text-lg font-semibold">
            Tool & Agent Platform
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.username}</span>
            <button className="rounded border px-3 py-1 text-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-[220px_1fr] gap-6 p-4">
        <aside className="rounded border bg-white p-2">
          <nav className="flex flex-col gap-1">
            <NavLink to="/catalog" className={navClassName}>
              Catalog
            </NavLink>
            <NavLink to="/tools/new" className={navClassName}>
              Register Tool
            </NavLink>
            <NavLink to="/playground" className={navClassName}>
              MCP Playground
            </NavLink>
            <NavLink to="/metrics" className={navClassName}>
              Metrics
            </NavLink>
            <NavLink to="/admin" className={navClassName}>
              Admin
            </NavLink>
          </nav>
        </aside>
        <main className="rounded border bg-white p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

