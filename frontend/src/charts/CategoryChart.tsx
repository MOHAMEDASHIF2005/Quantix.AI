import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { CategoryBreakdown } from "@/types";

export function CategoryChart({ data }: { data: CategoryBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#1B2030" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fill: "#8B92A8", fontSize: 11 }}
          axisLine={{ stroke: "#232838" }}
          tickLine={false}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fill: "#8B92A8", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "rgba(91,127,255,0.06)" }}
          contentStyle={{ background: "#12161F", border: "1px solid #232838", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "#E8EAF0", fontWeight: 600 }}
          formatter={(value: number, name: string) => [
            name === "inventory_value" ? `$${value.toLocaleString()}` : value,
            name === "inventory_value" ? "Inventory value" : "At-risk SKUs",
          ]}
        />
        <Bar dataKey="inventory_value" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.at_risk_count > 0 ? "#5B7FFF" : "#34D399"} fillOpacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
