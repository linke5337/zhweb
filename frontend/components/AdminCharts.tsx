"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { statsNationality, statsAge, statsTrend } from "@/lib/api";

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
];

export function AdminCharts() {
  const [nationality, setNationality] = useState<{ nationality: string; count: number }[]>([]);
  const [age, setAge] = useState<{ age_group: string; count: number }[]>([]);
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([statsNationality(), statsAge(), statsTrend()])
      .then(([n, a, tr]) => {
        setNationality(n);
        setAge(a);
        setTrend(tr);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={i === 2 ? "md:col-span-2" : ""}>
            <CardContent className="h-64 flex items-center justify-center">
              <div className="text-slate-400 text-sm animate-pulse">数据加载中…</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalGuests = nationality.reduce((s, n) => s + n.count, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 国籍饼图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">国籍分布</CardTitle>
          <CardDescription>共 {totalGuests} 位住客的国籍构成</CardDescription>
        </CardHeader>
        <CardContent>
          {nationality.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={nationality}
                  dataKey="count"
                  nameKey="nationality"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ nationality: n, percent }) =>
                    `${n} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {nationality.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} 人`, "人数"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 年龄柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">年龄层分布</CardTitle>
          <CardDescription>各年龄段住客人数统计</CardDescription>
        </CardHeader>
        <CardContent>
          {age.every((a) => a.count === 0) ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={age} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="age_group" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} 人`, "人数"]} />
                <Bar dataKey="count" name="人数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 30天趋势折线图 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">入住人数趋势（近30天）</CardTitle>
          <CardDescription>每日新增登记人数</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              近30天暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
                  }
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v) =>
                    new Date(v).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
                  }
                  formatter={(v) => [`${v} 人`, "登记人数"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="登记人数"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
