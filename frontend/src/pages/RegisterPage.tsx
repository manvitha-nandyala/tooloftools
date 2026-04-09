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
    <div className="mx-auto mt-16 max-w-md mis-panel p-8 shadow-md">
      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700">MIS Grid</p>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">Register</h1>
      <p className="mb-6 text-sm text-slate-600">Create an account to register and call tools.</p>
      <p className="mb-6 text-xs text-slate-500">
        Choose role and team carefully—admins may change these later. You will sign in on the next screen after registration.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="input-field"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="consumer">consumer</option>
          <option value="developer">developer</option>
          <option value="admin">admin</option>
        </select>
        <input
          className="input-field"
          placeholder="Team (optional)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Already registered?{" "}
        <Link className="text-link" to="/login">
          Back to login
        </Link>
      </p>
    </div>
  );
}

