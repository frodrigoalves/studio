
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { GaugeCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface Record {
  id: number;
  date: string;
  driver: string;
  car: string;
  plate: string;
  kmStart: number | null;
  kmEnd: number | null;
  status: "Finalizado" | "Em Andamento";
  startOdometerPhoto: string | null;
  endOdometerPhoto: string | null;
}

const getStoredRecords = (): Record[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('tripRecords');
    try {
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const chartConfig = {
    km: {
      label: "KM",
      color: "hsl(var(--primary))",
    },
    total: {
      label: "Total KM",
      color: "hsl(var(--primary))",
    },
};

type FilterType = "semanal" | "quinzenal" | "mensal";

export default function AdminDashboard() {
  const [filter, setFilter] = useState<FilterType>("mensal");
  const [records, setRecords] = useState<Record[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
      totalKm: 0,
      totalKmPrevious: 0,
      alerts: 0,
      performanceData: [],
      topVehicles: [],
  });

  useEffect(() => {
    const allRecords = getStoredRecords();
    setRecords(allRecords);
  }, []);

  useEffect(() => {
    if(records.length === 0) return;

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    
    // Define date ranges based on filter
    switch(filter) {
        case 'semanal':
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            previousStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            previousEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            break;
        case 'quinzenal':
            startDate = startOfDay(subDays(now, 14));
            previousStartDate = startOfDay(subDays(now, 28));
            previousEndDate = endOfDay(subDays(now, 15));
            break;
        case 'mensal':
            startDate = startOfMonth(now);
            previousStartDate = startOfMonth(subMonths(now, 1));
            previousEndDate = endOfMonth(subMonths(now, 1));
            break;
    }

    const filteredRecords = records.filter(r => {
        const recordDate = parseISO(r.date);
        return recordDate >= startDate;
    });

    const previousRecords = records.filter(r => {
        const recordDate = parseISO(r.date);
        return recordDate >= previousStartDate && recordDate <= previousEndDate;
    });
    
    // Calculate total KM for the current period
    const totalKm = filteredRecords
        .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
        .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);

    // Calculate total KM for the previous period
    const totalKmPrevious = previousRecords
        .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
        .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
        
    const alerts = records.filter(r => r.status === "Em Andamento").length;

    // Calculate performance data for the line chart
    const performanceData = (() => {
        switch(filter) {
            case 'semanal':
                return Array.from({ length: 7 }).map((_, i) => {
                    const day = startOfWeek(now, { weekStartsOn: 1 });
                    day.setDate(day.getDate() + i);
                    const dayString = format(day, 'EEE', { locale: ptBR });
                    const total = filteredRecords
                        .filter(r => r.status === 'Finalizado' && format(parseISO(r.date), 'EEE', { locale: ptBR }) === dayString)
                        .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
                    return { name: dayString, total: total };
                });
            case 'quinzenal':
                 return [
                    {
                      name: "Semana Anterior",
                      total: records.filter(r => {
                          const recordDate = parseISO(r.date);
                          return r.status === 'Finalizado' && recordDate >= startOfWeek(subWeeks(now, 1)) && recordDate <= endOfWeek(subWeeks(now, 1));
                      }).reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0)
                    },
                    {
                      name: "Semana Atual",
                      total: records.filter(r => {
                          const recordDate = parseISO(r.date);
                          return r.status === 'Finalizado' && recordDate >= startOfWeek(now) && recordDate <= endOfWeek(now);
                      }).reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0)
                    }
                ];
            case 'mensal':
                return Array.from({ length: 6 }).map((_, i) => {
                    const month = subMonths(now, 5 - i);
                    const monthString = format(month, 'MMM', { locale: ptBR });
                    const total = records
                        .filter(r => r.status === 'Finalizado' && format(parseISO(r.date), 'MMM', { locale: ptBR }) === monthString)
                        .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
                    return { name: monthString, total: total };
                });
        }
    })();
    
    const vehicleKm = filteredRecords
        .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
        .reduce((acc, r) => {
            const km = r.kmEnd! - r.kmStart!;
            if (!acc[r.car]) {
                acc[r.car] = 0;
            }
            acc[r.car] += km;
            return acc;
        }, {} as Record<string, number>);

    const topVehicles = Object.entries(vehicleKm)
        .map(([name, km]) => ({ name, km, fill: `hsl(var(--chart-${Math.floor(Math.random() * 5) + 1}))`}))
        .sort((a, b) => b.km - a.km)
        .slice(0, 5);


    setDashboardData({ totalKm, totalKmPrevious, alerts, performanceData, topVehicles });

  }, [records, filter]);
  
  const kmPercentageChange = dashboardData.totalKmPrevious > 0 
      ? ((dashboardData.totalKm - dashboardData.totalKmPrevious) / dashboardData.totalKmPrevious) * 100
      : dashboardData.totalKm > 0 ? 100 : 0;
      
  const xAxisKey = filter === 'semanal' ? 'name' : filter === 'quinzenal' ? 'name' : 'name';


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
            <div className="text-2xl font-bold">{dashboardData.totalKm.toLocaleString('pt-BR')} km</div>
            <p className={`text-xs ${kmPercentageChange >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {kmPercentageChange >= 0 ? '+' : ''}{kmPercentageChange.toFixed(1)}% do período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Preenchimento</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.alerts} Alertas</div>
            <p className="text-xs text-muted-foreground">Viagens em andamento.</p>
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
              <LineChart data={dashboardData.performanceData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={true} name="KM" />
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
                <BarChart data={dashboardData.topVehicles} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                    <XAxis type="number" hide />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="km" radius={5} name="KM" />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    