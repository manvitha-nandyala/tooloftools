import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicAuthConfig } from "../api/auth";
import { useAuth } from "../lib/auth-context";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerAllowed, setRegisterAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    getPublicAuthConfig()
      .then((c) => setRegisterAllowed(c.register_allowed))
      .catch(() => setRegisterAllowed(true));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ username, password, team: team || undefined });
      navigate("/login");
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (registerAllowed === false) {
    return (
      <div className="mx-auto mt-16 max-w-md mis-panel p-8 shadow-md">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700">MIS Grid</p>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">Registration closed</h1>
        <p className="mb-6 text-sm text-slate-600">
          Self-service sign-up is disabled. Ask an administrator for access or use your organization sign-in if
          available.
        </p>
        <Link className="text-link" to="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md mis-panel p-8 shadow-md">
      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700">MIS Grid</p>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">Register</h1>
      <p className="mb-6 text-sm text-slate-600">Create a consumer account to browse and call tools.</p>
      <p className="mb-6 text-xs text-slate-500">
        New accounts are always <strong className="font-medium text-slate-700">consumer</strong> role. An admin can
        promote you to developer or admin later.
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
        <input
          className="input-field"
          placeholder="Team (optional)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={loading || registerAllowed === null}>
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
