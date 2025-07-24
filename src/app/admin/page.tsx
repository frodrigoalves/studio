
'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2, FileText, Upload, Lightbulb, ListChecks, BarChart, Archive, BrainCircuit, GaugeCircle, AlertTriangle, Fuel, DollarSign, LineChart as LineChartIcon, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecords, type Record } from "@/services/records";
import { getDieselPrices, type DieselPrice } from "@/services/settings";
import { generateReport, type ReportOutput } from "@/ai/flows/report-flow";
import { analyseSheet, type SheetAnalysisInput, type SheetAnalysisOutput } from "@/ai/flows/sheet-analysis-flow";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bar, BarChart as BarChartComponent, Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartTooltip } from "@/components/ui/chart";
import { subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type Period = "daily" | "weekly" | "monthly";
type AnalysisType = 'hr' | 'maintenance';
type FilterType = "semanal" | "quinzenal" | "mensal";
const AVERAGE_KM_PER_LITER = 2.5;

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

const fileToDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csvText = XLSX.utils.sheet_to_csv(worksheet);
                    resolve(`data:text/csv;base64,${btoa(csvText)}`);
                } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                    const text = await new Promise<string>((res) => {
                        const textReader = new FileReader();
                        textReader.onload = (ev) => res(ev.target?.result as string);
                        textReader.readAsText(file);
                    });
                    resolve(`data:text/csv;base64,${btoa(text)}`);
                } else {
                    fileToDataURI(file).then(resolve).catch(reject);
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;

        if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
};


export default function AdminDashboard() {
    const { toast } = useToast();
    
    // Common state
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Dashboard state
    const [filter, setFilter] = useState<FilterType>("mensal");
    const [records, setRecords] = useState<Record[]>([]);
    const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>([]);

    // Fleet Report state
    const [fleetPeriod, setFleetPeriod] = useState<Period>("weekly");
    const [isFleetLoading, setIsFleetLoading] = useState(false);
    const [fleetReport, setFleetReport] = useState<ReportOutput | null>(null);

    // Sheet Analysis state
    const [analysisType, setAnalysisType] = useState<AnalysisType>('hr');
    const [file, setFile] = useState<File | null>(null);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    const [sheetAnalysisResult, setSheetAnalysisResult] = useState<SheetAnalysisOutput | null>(null);

    // Presentation Repository state
    const [repositoryContent, setRepositoryContent] = useState('');
    const [repositoryFile, setRepositoryFile] = useState<File | null>(null);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUserRole(userData.role);
        }

        const fetchAndSetData = async () => {
            setIsLoading(true);
            try {
                const [allRecords, allPrices] = await Promise.all([
                    getRecords(),
                    getDieselPrices()
                ]);
                setRecords(allRecords);
                setDieselPrices(allPrices);
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
        };
        fetchAndSetData();

    }, [toast]);

    const dashboardData = useMemo(() => {
        const latestPrice = dieselPrices.length > 0 ? parseFloat(dieselPrices[0].price) : 0;
        
        if(records.length === 0) return {
            totalKm: 0,
            totalKmPrevious: 0,
            alerts: 0,
            performanceData: [],
            topVehicles: [],
            totalCost: 0,
            latestDieselPrice: latestPrice
        };

        const now = new Date();
        let startDate: Date;
        let endDate: Date = endOfDay(now);
        let previousStartDate: Date;
        let previousEndDate: Date;
        
        switch(filter) {
            case 'semanal':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
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
            try {
                const recordDate = parseISO(r.date);
                return recordDate >= startDate && recordDate <= endDate;
            } catch { return false; }
        });

        const previousRecords = records.filter(r => {
            try {
                const recordDate = parseISO(r.date);
                return recordDate >= previousStartDate && recordDate <= previousEndDate;
            } catch { return false; }
        });
        
        const totalKm = filteredRecords
            .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
            .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);

        const totalKmPrevious = previousRecords
            .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart)
            .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
            
        const alerts = records.filter(r => r.status === "Em Andamento").length;
        
        const totalCost = (totalKm / AVERAGE_KM_PER_LITER) * latestPrice;

        const performanceData = (() => {
            switch(filter) {
                case 'semanal':
                    return Array.from({ length: 7 }).map((_, i) => {
                        const day = startOfWeek(now, { weekStartsOn: 1 });
                        day.setDate(day.getDate() + i);
                        const dayString = format(day, 'EEE', { locale: ptBR });
                        const total = records
                            .filter(r => {
                                if (r.status !== 'Finalizado' || !r.kmEnd || !r.kmStart) return false;
                                const recordDate = parseISO(r.date);
                                const start = startOfWeek(now, { weekStartsOn: 1 });
                                const end = endOfWeek(now, { weekStartsOn: 1 });
                                return recordDate >= start && recordDate <= end && format(recordDate, 'EEE', { locale: ptBR }) === dayString;
                            })
                            .reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0);
                        return { name: dayString, total: total };
                    });
                case 'quinzenal':
                     return [
                        {
                          name: "Semana Anterior",
                          total: records.filter(r => {
                              if (r.status !== 'Finalizado' || !r.kmEnd || !r.kmStart) return false;
                              const recordDate = parseISO(r.date);
                              const start = startOfWeek(subWeeks(now, 1), { locale: ptBR, weekStartsOn: 1 });
                              const end = endOfWeek(subWeeks(now, 1), { locale: ptBR, weekStartsOn: 1 });
                              return recordDate >= start && recordDate <= end;
                          }).reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0)
                        },
                        {
                          name: "Semana Atual",
                          total: records.filter(r => {
                               if (r.status !== 'Finalizado' || !r.kmEnd || !r.kmStart) return false;
                               const recordDate = parseISO(r.date);
                               const start = startOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
                               const end = endOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
                               return recordDate >= start && recordDate <= end;
                          }).reduce((sum, r) => sum + (r.kmEnd! - r.kmStart!), 0)
                        }
                    ];
                case 'mensal':
                    return Array.from({ length: 6 }).map((_, i) => {
                        const month = subMonths(now, 5 - i);
                        const monthString = format(month, 'MMM', { locale: ptBR });
                        const total = records
                            .filter(r => r.status === 'Finalizado' && r.kmEnd && r.kmStart && format(parseISO(r.date), 'MMM', { locale: ptBR }) === monthString)
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
            .map(([name, km]) => ({ name, km, fill: `var(--color-km)`}))
            .sort((a, b) => b.km - a.km)
            .slice(0, 5);


        return { totalKm, totalKmPrevious, alerts, performanceData, topVehicles, totalCost, latestDieselPrice: latestPrice };

    }, [records, filter, dieselPrices]);

    const kmPercentageChange = dashboardData.totalKmPrevious > 0 
      ? ((dashboardData.totalKm - dashboardData.totalKmPrevious) / dashboardData.totalKmPrevious) * 100
      : dashboardData.totalKm > 0 ? 100 : 0;
      
    const xAxisKey = filter === 'semanal' ? 'name' : filter === 'quinzenal' ? 'name' : 'name';


    const handleGenerateFleetReport = async () => {
        setIsFleetLoading(true);
        setFleetReport(null);
        try {
            if (records.length === 0 || dieselPrices.length === 0) {
                 toast({
                    variant: 'destructive',
                    title: 'Dados insuficientes',
                    description: 'Não há registros ou preços de diesel para gerar o relatório.'
                });
                return;
            }

            const generatedReport = await generateReport({
                records,
                dieselPrices,
                period: fleetPeriod,
            });
            setFleetReport(generatedReport);

        } catch (error) {
            console.error("Failed to generate report", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao gerar relatório',
                description: 'A IA não conseguiu processar os dados. Tente novamente.'
            });
        } finally {
            setIsFleetLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleRepositoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setRepositoryFile(event.target.files[0]);
        }
    };

    const handleGenerateSheetAnalysis = async () => {
        if (!file) {
          toast({
            variant: 'destructive',
            title: 'Nenhum arquivo selecionado',
            description: 'Por favor, faça o upload de um arquivo para análise.',
          });
          return;
        }
    
        setIsSheetLoading(true);
        setSheetAnalysisResult(null);
    
        try {
            const fileDataUri = await fileToDataURI(file);
            
            const analysisInput: SheetAnalysisInput = {
              fileDataUri: fileDataUri,
              analysisType,
            };
            
            const result = await analyseSheet(analysisInput);
            setSheetAnalysisResult(result);
    
        } catch (error) {
          console.error('Failed to analyze sheet', error);
          toast({
            variant: 'destructive',
            title: 'Erro na Análise',
            description:
              'A IA não conseguiu processar o arquivo. Verifique o formato e tente novamente.',
          });
        } finally {
          setIsSheetLoading(false);
        }
      };


  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
            <div className="inline-block bg-primary/10 text-primary rounded-full p-4 border-2 border-primary/20">
                <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">Central de Inteligência</h1>
            <p className="text-muted-foreground">Analise, gere relatórios e obtenha insights com IA para otimizar a operação.</p>
        </div>

        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
             <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <BarChart /> Análise de Desempenho
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex gap-2">
                                <Button variant={filter === 'semanal' ? 'default' : 'outline'} onClick={() => setFilter('semanal')}>Semanal</Button>
                                <Button variant={filter === 'quinzenal' ? 'default' : 'outline'} onClick={() => setFilter('quinzenal')}>Quinzenal</Button>
                                <Button variant={filter === 'mensal' ? 'default' : 'outline'} onClick={() => setFilter('mensal')}>Mensal</Button>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <h3 className="text-sm font-medium">KM Total ({filter})</h3>
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
                                <h3 className="text-sm font-medium">Custo Total ({filter})</h3>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ {dashboardData.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground">Custo com combustível no período.</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <h3 className="text-sm font-medium">Preço do Diesel</h3>
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ {dashboardData.latestDieselPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground">Último valor salvo.</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <h3 className="text-sm font-medium">Alertas de Preenchimento</h3>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dashboardData.alerts} Alertas</div>
                                <p className="text-xs text-muted-foreground">Viagens em andamento.</p>
                            </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                            <Card className="lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Desempenho Geral</CardTitle>
                                <CardDescription>Total de quilômetros rodados no período.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <LineChart data={dashboardData.performanceData} margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
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
                                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                    <BarChartComponent data={dashboardData.topVehicles} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                                        <XAxis type="number" hide />
                                        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="km" radius={5} name="KM" fill="var(--color-km)" />
                                    </BarChartComponent>
                                </ChartContainer>
                            </CardContent>
                            </Card>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
             
            <AccordionItem value="item-2">
                 <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <FileText /> Análise de Frota
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card className="shadow-lg mt-2 border-0">
                        <CardHeader>
                            <CardTitle>Gerador de Relatórios de Frota</CardTitle>
                            <CardDescription>Selecione o período e deixe a IA analisar os dados de viagem e gerar insights para você.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="w-full sm:w-auto flex-1 space-y-2">
                                    <Label htmlFor="period">Período de Análise</Label>
                                    <Select value={fleetPeriod} onValueChange={(value: Period) => setFleetPeriod(value)}>
                                        <SelectTrigger id="period">
                                            <SelectValue placeholder="Selecione o período" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Diário</SelectItem>
                                            <SelectItem value="weekly">Semanal</SelectItem>
                                            <SelectItem value="monthly">Mensal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleGenerateFleetReport} disabled={isFleetLoading} className="w-full sm:w-auto">
                                    {isFleetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                    {isFleetLoading ? "Analisando Frota..." : "Gerar Relatório de Frota"}
                                </Button>
                            </div>
                             {fleetReport && (
                                <Card className="mt-6 bg-muted/20">
                                    <CardHeader>
                                        <CardTitle>Relatório da Frota Gerado</CardTitle>
                                        <CardDescription>
                                            Análise para o período: <span className="font-semibold capitalize">{fleetPeriod.replace('daily', 'diário').replace('weekly', 'semanal').replace('monthly', 'mensal')}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg flex items-center gap-2"><ListChecks /> Resumo Executivo</h3>
                                            <Textarea readOnly value={fleetReport.summary} className="h-24 bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart2 /> Análise de Anomalias</h3>
                                            <Textarea readOnly value={fleetReport.trends} className="h-32 bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg flex items-center gap-2"><Lightbulb /> Recomendações</h3>
                                            <Textarea readOnly value={fleetReport.recommendations} className="h-32 bg-background" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
            
            {userRole === 'analyst' && (
                <>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-xl font-semibold">
                            <div className="flex items-center gap-2">
                                <Upload /> Análise de Documentos
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Card className="shadow-lg mt-2 border-0">
                                <CardHeader>
                                    <CardTitle>Análise Inteligente de Documentos (OCR)</CardTitle>
                                    <CardDescription>
                                        Faça o upload de planilhas, PDFs ou imagens de RH (atestados) ou Manutenção para que a IA identifique anomalias e tendências.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                        <Label htmlFor="analysis-type">Tipo de Análise</Label>
                                        <Select
                                            value={analysisType}
                                            onValueChange={(value: AnalysisType) => setAnalysisType(value)}
                                            disabled={isSheetLoading}
                                        >
                                            <SelectTrigger id="analysis-type">
                                            <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            <SelectItem value="hr">Recursos Humanos (Atestados)</SelectItem>
                                            <SelectItem value="maintenance">Manutenção de Veículos</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </div>
                                        <div className="space-y-2">
                                        <Label htmlFor="sheet-upload">Arquivo do Documento</Label>
                                        <div className="relative">
                                            <Input
                                                id="sheet-upload"
                                                type="file"
                                                onChange={handleFileChange}
                                                disabled={isSheetLoading}
                                                className="pr-12"
                                            />
                                            <Upload className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleGenerateSheetAnalysis}
                                        disabled={isSheetLoading || !file}
                                        className="w-full"
                                    >
                                        {isSheetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                        {isSheetLoading ? 'Analisando Documento...' : 'Analisar com IA'}
                                    </Button>

                                    {sheetAnalysisResult && (
                                        <Card className="mt-6 bg-muted/20">
                                            <CardHeader>
                                                <CardTitle>{sheetAnalysisResult.title}</CardTitle>
                                                <CardDescription>Abaixo estão os insights gerados pela IA com base no arquivo enviado.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold text-lg"><ListChecks /> Resumo Executivo</h3>
                                                    <Textarea readOnly value={sheetAnalysisResult.summary} className="h-24 bg-background" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold text-lg"><BarChart2 /> Principais Descobertas</h3>
                                                    <div className="space-y-4">
                                                        {sheetAnalysisResult.keyFindings.map((finding, index) => (
                                                            <div key={index} className="p-4 border rounded-lg bg-background/50">
                                                                <h4 className="font-semibold">{finding.finding}</h4>
                                                                <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold">Detalhes:</span> {finding.details}</p>
                                                                <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold">Impacto:</span> {finding.implication}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold text-lg"><Lightbulb /> Recomendações</h3>
                                                    <ul className="list-disc list-inside space-y-1 bg-background p-4 rounded-md">
                                                        {sheetAnalysisResult.recommendations.map((rec, index) => (
                                                            <li key={index}>{rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger className="text-xl font-semibold">
                            <div className="flex items-center gap-2">
                                <Archive /> Repositório da Apresentação
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                        <Card className="shadow-lg mt-2 border-0">
                                <CardHeader>
                                    <CardTitle>Assistente de Apresentação Semanal</CardTitle>
                                    <CardDescription>Cole aqui dados, links, rascunhos ou faça upload de arquivos. A IA usará este repositório como contexto para gerar resumos e análises para sua reunião.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="repository-content">Anotações e Rascunhos</Label>
                                            <Textarea
                                                id="repository-content"
                                                placeholder="Cole aqui o conteúdo bruto, links para documentos, anotações da última reunião ou qualquer dado que a IA deva considerar para a apresentação..."
                                                className="h-48 mt-2"
                                                value={repositoryContent}
                                                onChange={(e) => setRepositoryContent(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="repository-upload">Upload de Arquivos</Label>
                                             <div className="relative mt-2">
                                                <Input
                                                    id="repository-upload"
                                                    type="file"
                                                    onChange={handleRepositoryFileChange}
                                                    className="pr-12"
                                                />
                                                <Upload className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            </div>
                                            {repositoryFile && <p className="text-sm text-muted-foreground mt-2">Arquivo selecionado: {repositoryFile.name}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button disabled>
                                        <BrainCircuit className="mr-2 h-4 w-4" />
                                        Gerar Resumo da Apresentação (Em Breve)
                                    </Button>
                                </CardFooter>
                        </Card>
                        </AccordionContent>
                    </AccordionItem>
                </>
            )}
        </Accordion>
    </div>
  );
}
