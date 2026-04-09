import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicAuthConfig } from "../api/auth";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<{
    register_allowed: boolean;
    password_login_enabled: boolean;
    oidc_enabled: boolean;
  } | null>(null);

  useEffect(() => {
    getPublicAuthConfig()
      .then(setCfg)
      .catch(() =>
        setCfg({ register_allowed: true, password_login_enabled: true, oidc_enabled: false }),
      );
  }, []);

  const oidcLoginUrl = "/api/v1/auth/oidc/login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/catalog");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md mis-panel p-8 shadow-md">
      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700">MIS Grid</p>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">Login</h1>
      <p className="mb-6 text-sm text-slate-600">Sign in to manage tools and API access.</p>

      {cfg?.oidc_enabled ? (
        <div className="mb-6">
          <a className="btn-primary flex w-full justify-center" href={oidcLoginUrl}>
            Continue with organization SSO
          </a>
          <p className="mt-2 text-center text-xs text-slate-500">OpenID Connect (e.g. Azure AD / corporate IdP)</p>
        </div>
      ) : null}

      {cfg?.password_login_enabled ? (
        <>
          {cfg?.oidc_enabled ? (
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
              Or use username and password
            </p>
          ) : (
            <p className="mb-6 text-xs text-slate-500">
              Use the credentials issued by your administrator. If you need to create an account, use Register from the
              link below.
            </p>
          )}
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </>
      ) : (
        <p className="mb-6 text-sm text-slate-600">Password sign-in is disabled. Use organization SSO above.</p>
      )}

      {cfg?.register_allowed ? (
        <p className="mt-6 text-sm text-slate-600">
          Need an account?{" "}
          <Link className="text-link" to="/register">
            Register
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-xs text-slate-500">Self-service registration is disabled. Contact an administrator.</p>
      )}
    </div>
  );
}
