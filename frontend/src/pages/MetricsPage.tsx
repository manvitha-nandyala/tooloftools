import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMetricsSummary } from "../api/metrics";

export function MetricsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["metrics-summary"], queryFn: getMetricsSummary });

  if (isLoading) return <p>Loading metrics...</p>;
  if (!data) return <p>No metrics available.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Metrics Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="HTTP Requests" value={String(data.requests_total)} />
        <MetricCard title="Tool Invocations" value={String(data.tool_invocations_total)} />
        <MetricCard title="Tool Errors" value={String(data.tool_errors_total)} />
      </div>
      <div className="rounded border p-3">
        <h2 className="mb-3 text-sm font-medium">Per Tool Invocations</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.per_tool}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tool_id" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

