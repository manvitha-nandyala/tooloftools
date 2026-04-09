import { api } from "./client";
import type { AuthToken, Role, User } from "../types";

export interface PublicAuthConfig {
  register_allowed: boolean;
  password_login_enabled: boolean;
  oidc_enabled: boolean;
}

export async function getPublicAuthConfig() {
  const { data } = await api.get<PublicAuthConfig>("/api/v1/auth/public-config");
  return data;
}

export async function registerUser(payload: { username: string; password: string; team?: string }) {
  const { data } = await api.post<User>("/api/v1/auth/register", payload);
  return data;
}

export async function loginUser(payload: { username: string; password: string }) {
  const { data } = await api.post<AuthToken>("/api/v1/auth/login", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get<User>("/api/v1/auth/me");
  return data;
}

export async function listUsers() {
  const { data } = await api.get<User[]>("/api/v1/auth/users");
  return data;
}

export async function createApiKey(name: string) {
  const { data } = await api.post<{ key: string; name: string }>(`/api/v1/auth/api-keys?name=${name}`);
  return data;
}

export async function listApiKeys() {
  const { data } = await api.get<{ key: string; name: string; active: boolean; user_id: string }[]>(
    "/api/v1/auth/api-keys",
  );
  return data;
}

export async function revokeApiKey(key: string) {
  const { data } = await api.delete<{ revoked: boolean }>(`/api/v1/auth/api-keys/${encodeURIComponent(key)}`);
  return data;
}

export async function updateUserRole(userId: string, role: Role) {
  const { data } = await api.put<User>(`/api/v1/auth/users/${userId}/role`, { role });
  return data;
}

