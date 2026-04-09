import { api } from "./client";
import type { Tool, ToolListResponse } from "../types";

export async function listTools(params?: {
  page?: number;
  size?: number;
  category?: string;
  tags?: string;
}) {
  const { data } = await api.get<ToolListResponse>("/api/v1/tools", { params });
  return data;
}

export async function searchTools(query: string, params?: { page?: number; size?: number; category?: string }) {
  const { data } = await api.get<ToolListResponse>("/api/v1/tools/search", {
    params: { query, ...params },
  });
  return data;
}

export async function getTool(toolId: string) {
  const { data } = await api.get<Tool>(`/api/v1/tools/${toolId}`);
  return data;
}

export async function getCategories() {
  const { data } = await api.get<string[]>("/api/v1/categories");
  return data;
}

export async function createTool(payload: Record<string, unknown>) {
  const { data } = await api.post<Tool>("/api/v1/tools", payload);
  return data;
}

export async function updateTool(toolId: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Tool>(`/api/v1/tools/${toolId}`, payload);
  return data;
}

export async function validateToolInput(toolId: string, payload: Record<string, unknown>) {
  const { data } = await api.post<{ valid: boolean }>(`/api/v1/tools/${toolId}/validate`, payload);
  return data;
}

