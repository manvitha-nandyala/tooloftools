import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import type { Role } from "../types";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("consumer");
  const [team, setTeam] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ username, password, role, team: team || undefined });
      navigate("/login");
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-md rounded border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="w-full rounded border p-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="consumer">consumer</option>
          <option value="developer">developer</option>
          <option value="admin">admin</option>
        </select>
        <input className="w-full rounded border p-2" placeholder="Team (optional)" value={team} onChange={(e) => setTeam(e.target.value)} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-slate-900 px-4 py-2 text-white" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered? <Link className="underline" to="/login">Back to login</Link>
      </p>
    </div>
  );
}

