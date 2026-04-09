import { api } from "./client";

export async function callToolViaMcp(payload: { tool_id: string; arguments: Record<string, unknown> }) {
  const { data } = await api.post("/api/v1/mcp/call", payload);
  return data;
}

