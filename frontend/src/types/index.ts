export type Role = "admin" | "developer" | "consumer";

export interface User {
  id: string;
  username: string;
  role: Role;
  team?: string | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface Tool {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  version: string;
  tool_type: string;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  endpoint?: string | null;
  tags?: string[] | null;
  active: boolean;
  owner?: string | null;
  documentation_url?: string | null;
  auth_config?: Record<string, unknown> | null;
  rate_limit?: Record<string, unknown> | null;
}

export interface ToolListResponse {
  items: Tool[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

