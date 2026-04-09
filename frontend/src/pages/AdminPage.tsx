import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiKey, listApiKeys, listUsers, revokeApiKey, updateUserRole } from "../api/auth";
import type { Role } from "../types";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="rounded border p-3">
        <h2 className="mb-2 font-medium">Users</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-1">Username</th>
              <th className="py-1">Role</th>
              <th className="py-1">Team</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="py-1">{u.username}</td>
                <td className="py-1">{u.role}</td>
                <td className="py-1">{u.team ?? "-"}</td>
                <td className="py-1">
                  <select
                    className="rounded border p-1 text-xs"
                    value={u.role}
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
      <div className="rounded border p-3">
        <h2 className="mb-2 font-medium">API Key Management</h2>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={handleCreateKey}>
          Create API Key
        </button>
        {apiKey ? <p className="mt-2 break-all rounded bg-slate-100 p-2 text-xs">{apiKey}</p> : null}
        <div className="mt-3 space-y-2">
          {(apiKeys ?? []).map((k) => (
            <div key={k.key} className="flex items-center justify-between rounded border p-2 text-xs">
              <span className="max-w-[70%] truncate">{k.name} • {k.active ? "active" : "revoked"} • {k.key}</span>
              {k.active ? (
                <button className="rounded border px-2 py-1" onClick={() => handleRevoke(k.key)}>
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

