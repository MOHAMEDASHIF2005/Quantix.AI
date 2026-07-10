import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { DemandRecord, ForecastPoint } from "@/types";

interface ChartRow {
  label: string;
  history?: number;
  forecast?: number;
  lower?: number;
  band?: number; // upper - lower, stacked on top of lower for the shaded band
  isForecast: boolean;
}

export function DemandForecastChart({
  history,
  forecast,
}: {
  history: DemandRecord[];
  forecast: ForecastPoint[];
}) {
  const historyRows: ChartRow[] = history.slice(-12).map((h) => ({
    label: new Date(h.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    history: h.units_sold,
    isForecast: false,
  }));

  const forecastRows: ChartRow[] = forecast.map((f) => ({
    label: f.period_label.replace("Week ", ""),
    forecast: f.expected_demand,
    lower: f.lower_bound,
    band: Math.max(0, f.upper_bound - f.lower_bound),
    isForecast: true,
  }));

  // bridge point so the forecast line connects visually to history
  if (historyRows.length && forecastRows.length) {
    forecastRows[0] = { ...forecastRows[0] };
  }

  const data = [...historyRows, ...forecastRows];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#1B2030" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#8B92A8", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={{ stroke: "#232838" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8B92A8", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "#12161F",
            border: "1px solid #232838",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "Inter",
          }}
          labelStyle={{ color: "#E8EAF0", fontWeight: 600, marginBottom: 4 }}
        />
        <ReferenceLine
          x={historyRows[historyRows.length - 1]?.label}
          stroke="#232838"
          strokeDasharray="3 3"
        />
        <Area
          dataKey="lower"
          stackId="band"
          stroke="none"
          fill="transparent"
          isAnimationActive={false}
        />
        <Area
          dataKey="band"
          stackId="band"
          stroke="none"
          fill="#5B7FFF"
          fillOpacity={0.12}
          name="Confidence band"
          isAnimationActive={false}
        />
        <Line
          dataKey="history"
          stroke="#8B92A8"
          strokeWidth={2}
          dot={false}
          name="Actual demand"
          isAnimationActive={false}
        />
        <Line
          dataKey="forecast"
          stroke="#5B7FFF"
          strokeWidth={2.5}
          strokeDasharray="0"
          dot={{ r: 2.5, fill: "#5B7FFF", strokeWidth: 0 }}
          name="Forecasted demand"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
