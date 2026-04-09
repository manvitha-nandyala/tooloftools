import { api } from "./client";

export async function getMetricsSummary() {
  const { data } = await api.get("/api/v1/metrics/summary");
  return data as {
    requests_total: number;
    tool_invocations_total: number;
    tool_errors_total: number;
    per_tool: { tool_id: string; count: number; errors: number }[];
  };
}

