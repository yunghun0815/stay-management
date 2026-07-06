"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#2563eb",
  "#0ea5e9",
  "#0d9488",
  "#f59e0b",
  "#dc2626",
  "#db2777",
  "#9333ea",
  "#71717a",
];

export function CategoryPieChart({
  data,
}: {
  data: { name: string; value: number; color?: string }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={90}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function YearlyBarChart({
  data,
}: {
  data: { year: string; income: number; expense: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={60} />
        <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
        <Bar dataKey="income" name="수입" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="지출" fill="#dc2626" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={60} />
        <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
        <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
