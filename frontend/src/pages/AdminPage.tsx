import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiKey, listApiKeys, listUsers, revokeApiKey, updateUserRole } from "../api/auth";
import type { Role } from "../types";
import { Hint } from "../components/ui/hint";

export function AdminPage() {
  const { data: users, refetch } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { data: apiKeys, refetch: refetchKeys } = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });
  const [apiKey, setApiKey] = useState("");

  async function handleCreateKey() {
    const created = await createApiKey("ui-generated");
    setApiKey(created.key);
    refetchKeys();
  }

  async function handleRoleChange(userId: string, role: Role) {
    await updateUserRole(userId, role);
    refetch();
  }

  async function handleRevoke(key: string) {
    await revokeApiKey(key);
    refetchKeys();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin</h1>
        <p className="text-sm text-slate-600">Users and API keys for MIS Grid.</p>
        <p className="text-xs text-slate-500">
          Roles control who can register tools and access admin. Keys authenticate API clients—store them securely.
        </p>
      </div>
      <div className="mis-panel p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-900/70">Users</h2>
          <Hint text="Change a user's role to grant developer, admin, or consumer access. Changes apply on next request." />
        </div>
        <p className="mb-4 text-xs text-slate-500">Scroll horizontally on small screens if the table is wider than the panel.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-indigo-100 text-left text-slate-600">
                <th className="py-2 pr-4 font-medium">Username</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Actions
                    <Hint text="Role changes immediately affect authorization for that user." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 text-slate-900">{u.username}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{u.role}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{u.team ?? "—"}</td>
                  <td className="py-2.5">
                    <select
                      className="input-field max-w-[160px] py-1.5 text-xs"
                      value={u.role}
                      title="Change role for this user"
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    >
                      <option value="consumer">consumer</option>
                      <option value="developer">developer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mis-panel space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-900/70">API keys</h2>
          <Hint text="Keys are shown once at creation. Revoke compromised keys and create a new one." />
        </div>
        <p className="text-xs text-slate-500">
          Create keys for automation and scripts. Treat them like passwords—never commit them to source control.
        </p>
        <button type="button" className="btn-primary" title="Generate a new API key and show it once below" onClick={handleCreateKey}>
          Create API key
        </button>
        {apiKey ? (
          <p className="break-all rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-950">{apiKey}</p>
        ) : null}
        <div className="space-y-2">
          {(apiKeys ?? []).map((k) => (
            <div
              key={k.key}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 break-all text-slate-700">
                {k.name} · {k.active ? "active" : "revoked"} · {k.key}
              </span>
              {k.active ? (
                <button
                  type="button"
                  className="btn-secondary shrink-0 self-start px-3 py-1 text-xs sm:self-auto"
                  title="Invalidate this key immediately"
                  onClick={() => handleRevoke(k.key)}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
