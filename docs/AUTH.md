# Authentication and RBAC

## Roles (coarse RBAC)

| Role | Typical use |
|------|----------------|
| `consumer` | Browse catalog, call tools via MCP HTTP, metrics as allowed |
| `developer` | Register and edit tools, validate schemas |
| `admin` | Delete tools, manage users and roles, full access |

API enforcement is via `require_role` on routes (see `src/app/api/deps.py`).

## Self-service registration

- `POST /api/v1/auth/register` always creates **`consumer`** accounts. Any `role` field in the JSON body is ignored.
- Disable open registration with **`REGISTER_ALLOWED=false`** (env).

## Password login

- Disable with **`PASSWORD_LOGIN_ENABLED=false`** (e.g. SSO-only deployments).
- Users created via OIDC have no password; they must use SSO.

## Break-glass admin (bootstrap)

Set in environment (never commit real values):

- `BOOTSTRAP_ADMIN_ENABLED=true`
- `BOOTSTRAP_ADMIN_USERNAME=...`
- `BOOTSTRAP_ADMIN_PASSWORD=...`

On startup the app **upserts** that user as `admin` and refreshes the password hash when the env password changes.

## OIDC (MoveInSync / Azure AD / corporate IdP)

1. Register an OAuth2/OIDC client with your IdP.
2. **Redirect URI** (must match exactly):  
   `https://<your-api-host>/api/v1/auth/oidc/callback`
3. Set env:

| Variable | Purpose |
|----------|---------|
| `OIDC_ENABLED` | `true` to show SSO and enable routes |
| `OIDC_ISSUER` | Issuer URL (OpenID discovery at `/.well-known/openid-configuration`) |
| `OIDC_CLIENT_ID` | Client id |
| `OIDC_CLIENT_SECRET` | Client secret |
| `OIDC_REDIRECT_URI` | Same as registered redirect URI |
| `OIDC_SCOPES` | Default `openid email profile` |
| `OIDC_DEFAULT_ROLE` | First-time SSO user role: `consumer`, `developer`, or `admin` (default `consumer`) |
| `PUBLIC_APP_URL` | Optional. After login, redirect browser to this origin for `/oidc-callback` (e.g. `http://localhost:5173` when API is on 8000 and Vite on 5173). If unset, uses the API request host. |

4. Login UI shows **Continue with organization SSO** when `OIDC_ENABLED` is true.

5. Flow: browser → `GET /api/v1/auth/oidc/login` → IdP → `GET /api/v1/auth/oidc/callback?code=...` → app JWT → redirect to `{PUBLIC_APP_URL or API host}/oidc-callback#token=...` → SPA stores token and continues.

## Admin maintenance

- Existing **admins** promote users via **Admin** UI or `PUT /api/v1/auth/users/{id}/role`.
- No self-service admin role through registration.

## Public feature flags (unauthenticated)

`GET /api/v1/auth/public-config` returns:

- `register_allowed`
- `password_login_enabled`
- `oidc_enabled`

Used by the login and register pages.

## Migrations

After pulling User model changes, run:

```bash
alembic upgrade head
```

Revision `001_identity` adds `auth_provider`, `external_sub`, `email`, and nullable `hashed_password`.
