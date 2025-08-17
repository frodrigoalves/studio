
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, GaugeCircle, AlertTriangle, Fuel, DollarSign, Activity, Calendar as CalendarIcon, Info, Database, Car, Droplets, Wrench, BarChart, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecords, type Record } from "@/services/records";
import { getDieselPrices, type DieselPrice } from "@/services/settings";
import { getVehicleParameters, type VehicleParameters } from "@/services/vehicles";
import { getFuelingRecords, type FuelingRecord } from "@/services/fueling";
import { getMaintenanceRecords } from "@/services/maintenance";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bar, BarChart as BarChartComponent, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO, compareAsc } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";


const DEFAULT_KM_PER_LITER = 2.5;

export default function AdminDashboard() {
    const { toast } = useToast();
    
    // Common state
    const [isLoading, setIsLoading] = useState(true);

    // Dashboard state
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [records, setRecords] = useState<Record[]>([]);
    const [fuelingRecords, setFuelingRecords] = useState<FuelingRecord[]>([]);
    const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>([]);
    const [vehicleParameters, setVehicleParameters] = useState<VehicleParameters[]>([]);
     const [dbStats, setDbStats] = useState({
        vehicles: 0,
        fueling: 0,
        maintenance: 0,
        diesel: 0,
        tripRecords: 0,
        tripAlerts: 0,
    });

    const fetchAndSetData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [
                tripData,
                allPrices,
                allParameters,
                allFuelingRecords,
                maintenanceData,
             ] = await Promise.all([
                getRecords(),
                getDieselPrices(),
                getVehicleParameters(),
                getFuelingRecords(),
                getMaintenanceRecords(),
            ]);
            setRecords(tripData);
            setDieselPrices(allPrices);
            setVehicleParameters(allParameters);
            setFuelingRecords(allFuelingRecords);
            
            const tripAlerts = tripData.filter(r => 
                r.status === "Em Andamento" || 
                (r.status === "Finalizado" && (!r.startOdometerPhoto || !r.endOdometerPhoto))
            ).length;

            setDbStats({
                vehicles: allParameters.length,
                fueling: allFuelingRecords.length,
                maintenance: maintenanceData.length,
                diesel: allPrices.length,
                tripRecords: tripData.length,
                tripAlerts,
            });

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados',
                description: 'Não foi possível buscar os registros para o dashboard.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    const dashboardData = useMemo(() => {
        const latestPrice = dieselPrices.length > 0 ? parseFloat(dieselPrices[0].price) : 0;
        
        const emptyData = {
            totalKm: 0,
            alerts: 0,
            performanceData: [],
            topVehicles: [],
            totalCost: 0,
            latestDieselPrice: latestPrice,
            averageConsumption: 0,
        };

        if (records.length === 0 || !dateRange?.from || !dateRange?.to) {
            return emptyData;
        }

        const { from: startDate, to: endDate } = dateRange;

        const filteredRecords = records.filter(r => {
            try {
                const recordDate = parseISO(r.date);
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return recordDate >= start && recordDate <= end;
            } catch { return false; }
        });
        
        const totalKm = filteredRecords
            .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
            .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
            
        const alerts = records.filter(r => 
            r.status === "Em Andamento" || 
            (r.status === "Finalizado" && (!r.startOdometerPhoto || !r.endOdometerPhoto))
        ).length;
        
        const totalCost = filteredRecords
            .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
            .reduce((sum, r) => {
                const km = r.kmEnd! - r.kmStart!;
                const vehicleParam = vehicleParameters.find(p => p.carId === r.car);
                const consumption = vehicleParam?.thresholds.green || DEFAULT_KM_PER_LITER;
                const cost = (km / consumption) * latestPrice;
                return sum + cost;
            }, 0);


        const performanceData = (() => {
            const diffDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

            const groupedData = new Map<string, { date: Date, total: number }>();
            const formatKey = diffDays > 31 
                ? (date: Date) => format(date, 'MMM/yy', { locale: ptBR })
                : (date: Date) => format(date, 'yyyy-MM-dd'); // Use a sortable format

            filteredRecords.forEach(r => {
                if (r.status === 'Finalizado' && r.kmEnd && r.kmStart) {
                    try {
                        const recordDate = parseISO(r.date);
                        const key = formatKey(recordDate);
                        const currentData = groupedData.get(key) || { date: recordDate, total: 0 };
                        currentData.total += (r.kmEnd! - r.kmStart!);
                        groupedData.set(key, currentData);
                    } catch {}
                }
            });

            return Array.from(groupedData.values())
                .sort((a,b) => compareAsc(a.date, b.date))
                .map((value) => ({ 
                    name: format(value.date, diffDays > 31 ? 'MMM/yy' : 'dd/MM', { locale: ptBR }), 
                    total: value.total,
                }));
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
            .map(([name, km]) => ({ name, km, fill: "var(--color-primary)"}))
            .sort((a, b) => b.km - a.km)
            .slice(0, 10);
            
        const filteredFuelingRecords = fuelingRecords.filter(f => {
             try {
                const recordDate = parseISO(f.date);
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return recordDate >= start && recordDate <= end;
            } catch { return false; }
        });

        const totalLiters = filteredFuelingRecords.reduce((sum, r) => sum + r.liters, 0);

        const averageConsumption = totalLiters > 0 ? totalKm / totalLiters : 0;


        return { totalKm, alerts, performanceData, topVehicles, totalCost, latestDieselPrice: latestPrice, averageConsumption };

    }, [records, fuelingRecords, dateRange, dieselPrices, vehicleParameters]);


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        
         <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database /> Status do Banco de Dados
                    </CardTitle>
                    <CardDescription>Visão geral dos dados que alimentam o sistema. Para importar, vá para a página de <a href="/admin/settings" className="underline text-primary">Configurações</a>.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        Registros de Viagem
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dbStats.tripRecords.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                       <AlertTriangle className="h-3 w-3 text-destructive" /> {dbStats.tripAlerts.toLocaleString('pt-BR')} Alertas pendentes
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        Parâmetros de Veículos
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dbStats.vehicles.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground">Veículos com parâmetros</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        Abastecimentos
                                         <Fuel className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dbStats.fueling.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground">Registros importados</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        Manutenções
                                         <Wrench className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dbStats.maintenance.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground">Registros importados</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        Preços do Diesel
                                         <Droplets className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dbStats.diesel.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground">Preços salvos</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>
            </Card>

        <Accordion type="single" collapsible className="w-full" defaultValue={'item-1'}>
             <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <BarChart /> Análise de Desempenho da Frota
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                             <div className="flex items-center gap-2 flex-wrap">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full sm:w-[260px] justify-start text-left font-normal",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                                                        {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y", { locale: ptBR })
                                                )
                                            ) : (
                                                <span>Selecione um período</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 })})}>Esta Semana</Button>
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 15), to: new Date()})}>Últimos 15 dias</Button>
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>Este Mês</Button>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-medium">KM Total</h3>
                                        <Popover>
                                            <PopoverTrigger>
                                                <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                            </PopoverTrigger>
                                            <PopoverContent className="text-xs">
                                                Soma de todos os quilômetros rodados (KM Final - KM Inicial) para viagens com status "Finalizado" no período selecionado.
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <GaugeCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dashboardData.totalKm.toLocaleString('pt-BR')} km</div>
                                    <p className="text-xs text-muted-foreground">KM total rodado no período.</p>
                                </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium">Custo Estimado</h3>
                                     <Popover>
                                        <PopoverTrigger>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                        </PopoverTrigger>
                                        <PopoverContent className="text-xs">
                                           Estimativa de custo calculada usando a fórmula: (KM Total / Consumo do Veículo) * Último Preço do Diesel. O consumo é a meta 'Verde' específica de cada veículo, ou {DEFAULT_KM_PER_LITER} KM/L se não houver parâmetro.
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ {dashboardData.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground">Custo com combustível no período.</p>
                            </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-medium">Consumo Médio</h3>
                                        <Popover>
                                            <PopoverTrigger>
                                                <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                            </PopoverTrigger>
                                            <PopoverContent className="text-xs">
                                                Consumo médio real da frota, calculado pela fórmula: (KM Total Rodado / Litros Totais Abastecidos) no período selecionado.
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dashboardData.averageConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</div>
                                    <p className="text-xs text-muted-foreground">Desempenho real da frota.</p>
                                </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium">Preço do Diesel</h3>
                                     <Popover>
                                        <PopoverTrigger>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                        </PopoverTrigger>
                                        <PopoverContent className="text-xs">
                                            Valor mais recente do preço do diesel registrado na aba de Configurações.
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ {dashboardData.latestDieselPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground">Último valor salvo.</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium">Alertas</h3>
                                    <Popover>
                                        <PopoverTrigger>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                        </PopoverTrigger>
                                        <PopoverContent className="text-xs">
                                            Número de viagens "Em Andamento" ou viagens "Finalizadas" que não possuem uma das fotos de odômetro (início ou fim).
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dashboardData.alerts} Alertas</div>
                                <p className="text-xs text-muted-foreground">Viagens em aberto ou com fotos faltando.</p>
                            </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                            <Card className="lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Desempenho Geral</CardTitle>
                                <CardDescription>Total de quilômetros rodados no período selecionado.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                               <ChartContainer config={{}} className="h-[350px] w-full">
                                    <LineChart accessibilityLayer data={dashboardData.performanceData} margin={{ left: 12, right: 12 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Line dataKey="total" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={true} name="KM" />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                            </Card>
                            <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Top 10 Veículos por KM</CardTitle>
                                <CardDescription>Veículos que mais rodaram no período.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="h-[350px] w-full">
                                    <BarChartComponent accessibilityLayer data={dashboardData.topVehicles} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                                        <XAxis type="number" hide />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="km" radius={5} name="KM" fill="hsl(var(--primary))" barSize={15} />
                                    </BarChartComponent>
                                </ChartContainer>
                            </CardContent>
                            </Card>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}

    
