"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReportData = { date: string; total: number; count: number };

export default function RelatoriosPage() {
  const { slug } = useParams<{ slug: string }>();
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [data, setData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalOrders: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch(`/api/admin/reports?slug=${slug}&period=${period}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res.data || []);
        setSummary(res.summary || null);
      })
      .finally(() => setLoading(false));
  }, [slug, period]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios de Vendas</h1>

      {/* Botões de período */}
      <div className="flex gap-4">
        <Button variant={period === "weekly" ? "default" : "outline"} onClick={() => setPeriod("weekly")}>
          Semanal
        </Button>
        <Button variant={period === "monthly" ? "default" : "outline"} onClick={() => setPeriod("monthly")}>
          Mensal
        </Button>
        <Button variant={period === "yearly" ? "default" : "outline"} onClick={() => setPeriod("yearly")}>
          Anual
        </Button>
      </div>

      {/* Resumo rápido */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-500 text-sm">Faturamento</p>
              <p className="text-xl font-semibold">
                R$ {summary.totalRevenue.toFixed(2).replace(".", ",")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-500 text-sm">Pedidos</p>
              <p className="text-xl font-semibold">{summary.totalOrders}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p>Carregando...</p>
          ) : data.length === 0 ? (
            <p>Nenhum dado encontrado.</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} />
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
