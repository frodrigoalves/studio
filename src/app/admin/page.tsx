"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Car, Fuel, GaugeCircle, Users } from "lucide-react";

// Mock Data
const totalKmData = [
  { month: "Jan", total: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Fev", total: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Mar", total: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Abr", total: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Mai", total: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Jun", total: Math.floor(Math.random() * 5000) + 1000 },
];

const kmPerVehicleData = [
  { name: "Carro A", km: 4000, fill: "var(--color-a)" },
  { name: "Carro B", km: 3000, fill: "var(--color-b)" },
  { name: "Carro C", km: 2000, fill: "var(--color-c)" },
  { name: "Carro D", km: 2780, fill: "var(--color-d)" },
  { name: "Carro E", km: 1890, fill: "var(--color-e)" },
];

const chartConfig = {
    km: {
      label: "KM",
    },
    total: {
      label: "Total KM",
      color: "hsl(var(--primary))",
    },
    a: { label: "Carro A", color: "hsl(var(--chart-1))" },
    b: { label: "Carro B", color: "hsl(var(--chart-2))" },
    c: { label: "Carro C", color: "hsl(var(--chart-3))" },
    d: { label: "Carro D", color: "hsl(var(--chart-4))" },
    e: { label: "Carro E", color: "hsl(var(--chart-5))" },
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KM Total (Mês)</CardTitle>
            <GaugeCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231.89 km</div>
            <p className="text-xs text-muted-foreground">+20.1% do mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo de Combustível</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 12,234.50</div>
            <p className="text-xs text-muted-foreground">+18.3% do mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos Ativos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">2 em manutenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motoristas Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">+2 novos motoristas</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de KM</CardTitle>
            <CardDescription>Total de quilômetros rodados por mês.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={totalKmData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={true} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>KM por Veículo</CardTitle>
            <CardDescription>Distribuição de KM entre os veículos no último mês.</CardDescription>
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
