"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Fuel, GaugeCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock Data
const totalKmData = {
  semanal: [
    { day: "Seg", total: 1200 },
    { day: "Ter", total: 1500 },
    { day: "Qua", total: 1300 },
    { day: "Qui", total: 1800 },
    { day: "Sex", total: 2200 },
    { day: "Sáb", total: 2500 },
    { day: "Dom", total: 900 },
  ],
  quinzenal: [
    { week: "Sem 1", total: 8000 },
    { week: "Sem 2", total: 9500 },
  ],
  mensal: [
    { month: "Jan", total: 35000 },
    { month: "Fev", total: 38000 },
    { month: "Mar", total: 42000 },
    { month: "Abr", total: 41000 },
    { month: "Mai", total: 45000 },
    { month: "Jun", total: 43000 },
  ],
};


const kmPerVehicleData = [
  { name: "Carro C", km: 5200, fill: "var(--color-a)" },
  { name: "Carro A", km: 4800, fill: "var(--color-b)" },
  { name: "Carro D", km: 4100, fill: "var(--color-c)" },
  { name: "Carro B", km: 3500, fill: "var(--color-d)" },
  { name: "Carro E", km: 2800, fill: "var(--color-e)" },
];

const chartConfig = {
    km: {
      label: "KM",
    },
    total: {
      label: "Total KM",
      color: "hsl(var(--primary))",
    },
    a: { label: "Carro C", color: "hsl(var(--chart-1))" },
    b: { label: "Carro A", color: "hsl(var(--chart-2))" },
    c: { label: "Carro D", color: "hsl(var(--chart-3))" },
    d: { label: "Carro B", color: "hsl(var(--chart-4))" },
    e: { label: "Carro E", color: "hsl(var(--chart-5))" },
};

type FilterType = "semanal" | "quinzenal" | "mensal";

export default function AdminDashboard() {
  const [filter, setFilter] = useState<FilterType>("mensal");

  const activeData = totalKmData[filter];
  const xAxisKey = filter === 'semanal' ? 'day' : filter === 'quinzenal' ? 'week' : 'month';


  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Análise de Desempenho</h1>
        <div className="flex gap-2">
            <Button variant={filter === 'semanal' ? 'default' : 'outline'} onClick={() => setFilter('semanal')}>Semanal</Button>
            <Button variant={filter === 'quinzenal' ? 'default' : 'outline'} onClick={() => setFilter('quinzenal')}>Quinzenal</Button>
            <Button variant={filter === 'mensal' ? 'default' : 'outline'} onClick={() => setFilter('mensal')}>Mensal</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KM Total ({filter})</CardTitle>
            <GaugeCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231 km</div>
            <p className="text-xs text-muted-foreground">+20.1% do período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo de Combustível ({filter})</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 12,234.50</div>
            <p className="text-xs text-muted-foreground">+18.3% do período anterior</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Desempenho Geral</CardTitle>
            <CardDescription>Total de quilômetros rodados no período.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={activeData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={true} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top 5 Veículos por KM</CardTitle>
            <CardDescription>Veículos que mais rodaram no período.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={kmPerVehicleData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={60} />
                    <XAxis type="number" hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="km" radius={5} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    