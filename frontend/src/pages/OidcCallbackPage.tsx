import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const TOKEN_KEY = "tooloftools_token";

/**
 * OIDC redirect target: backend sends Location to /oidc-callback#token=...
 */
export function OidcCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(raw);
    const token = params.get("token");
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      window.location.replace("/catalog");
      return;
    }
    setError("Missing token in redirect. Try signing in again.");
  }, []);

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-md mis-panel p-8 shadow-md">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Sign-in incomplete</h1>
        <p className="mb-6 text-sm text-red-600">{error}</p>
        <Link className="text-link" to="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md mis-panel p-8 text-center text-sm text-slate-600">
      Completing sign-in…
    </div>
  );
}
