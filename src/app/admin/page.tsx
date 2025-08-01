
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, FileText, Upload, Lightbulb, ListChecks, BarChart, Archive, BrainCircuit, GaugeCircle, AlertTriangle, Fuel, DollarSign, LineChart as LineChartIcon, BarChart2, Calendar as CalendarIcon, FileUp, Info, MapPin as MapIcon, Database, Car, Droplets, Wrench, Clock, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecords, type Record } from "@/services/records";
import { getDieselPrices, type DieselPrice } from "@/services/settings";
import { getVehicleParameters, type VehicleParameters, getMostRecentVehicleParameter } from "@/services/vehicles";
import { getFuelingRecords, getMostRecentFuelingRecord, type FuelingRecord } from "@/services/fueling";
import { getMaintenanceRecords, getMostRecentMaintenanceRecord } from "@/services/maintenance";
import { generateReport, type ReportOutput } from "@/ai/flows/report-flow";
import { analyseSheet, type SheetAnalysisInput, type SheetAnalysisOutput } from "@/ai/flows/sheet-analysis-flow";
import { generatePresentationSummary, type PresentationInput, type PresentationOutput } from "@/ai/flows/presentation-flow";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bar, BarChart as BarChartComponent, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO, compareAsc, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';


const AVERAGE_KM_PER_LITER = 2.5;

const fileToDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const processSheetFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const csvData = Papa.unparse(jsonData as Papa.ParseResult<any>['data']);
                // Pass the raw CSV text to a text/plain data URI. The AI can parse this.
                const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(csvData)}`;
                resolve(dataUri);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

export default function AdminDashboard() {
    const { toast } = useToast();
    
    // Common state
    const [userRole, setUserRole] = useState<string | null>(null);
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
        vehicles: { count: 0, lastImport: '' },
        fueling: { count: 0, lastImport: '' },
        maintenance: { count: 0, lastImport: '' },
        diesel: { count: 0, lastImport: '' },
        tripRecords: 0,
        tripAlerts: 0,
    });


    // Fleet Report state
    const [isFleetLoading, setIsFleetLoading] = useState(false);
    const [fleetReport, setFleetReport] = useState<ReportOutput | null>(null);

    // Sheet Analysis state
    const [analysisType, setAnalysisType] = useState<string>('Análise de Atestados Médicos');
    const [file, setFile] = useState<File | null>(null);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    const [sheetAnalysisResult, setSheetAnalysisResult] = useState<SheetAnalysisOutput | null>(null);

    // Presentation Repository state
    const [repositoryContent, setRepositoryContent] = useState('');
    const [repositoryFile, setRepositoryFile] = useState<File | null>(null);
    const [isPresentationLoading, setIsPresentationLoading] = useState(false);
    const [presentationResult, setPresentationResult] = useState<PresentationOutput | null>(null);


    const fetchAndSetData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [
                allRecords, allPrices, allParameters,
                vehiclesData, allFuelingRecords, maintenanceData, tripData,
                lastVehicle, lastFueling, lastMaintenance
             ] = await Promise.all([
                getRecords(),
                getDieselPrices(),
                getVehicleParameters(),
                getVehicleParameters(),
                getFuelingRecords(),
                getMaintenanceRecords(),
                getRecords(),
                getMostRecentVehicleParameter(),
                getMostRecentFuelingRecord(),
                getMostRecentMaintenanceRecord()
            ]);
            setRecords(allRecords);
            setDieselPrices(allPrices);
            setVehicleParameters(allParameters);
            setFuelingRecords(allFuelingRecords);
            
            const tripAlerts = tripData.filter(r => 
                r.status === "Em Andamento" || 
                (r.status === "Finalizado" && (!r.startOdometerPhoto || !r.endOdometerPhoto))
            ).length;

            setDbStats({
                vehicles: {
                    count: vehiclesData.length,
                    lastImport: lastVehicle?.lastUpdated || ''
                },
                fueling: {
                    count: allFuelingRecords.length,
                    lastImport: lastFueling?.date || ''
                },
                maintenance: {
                    count: maintenanceData.length,
                    lastImport: lastMaintenance?.startDate || ''
                },
                diesel: {
                    count: allPrices.length,
                    lastImport: allPrices[0]?.date || ''
                },
                tripRecords: tripData.length,
                tripAlerts: tripAlerts,
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
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUserRole(userData.role);
        }
        fetchAndSetData();
    }, [fetchAndSetData]);

    const dashboardData = useMemo(() => {
        const latestPrice = dieselPrices.length > 0 ? parseFloat(dieselPrices[0].price) : 0;
        
        if(records.length === 0) return {
            totalKm: 0,
            alerts: 0,
            performanceData: [],
            topVehicles: [],
            totalCost: 0,
            latestDieselPrice: latestPrice,
            averageConsumption: 0,
        };

        const { from: startDate, to: endDate } = dateRange || { from: new Date(), to: new Date()};

        const filteredRecords = records.filter(r => {
            if (!startDate || !endDate) return true;
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
                const consumption = vehicleParam?.thresholds.green || AVERAGE_KM_PER_LITER;
                const cost = (km / consumption) * latestPrice;
                return sum + cost;
            }, 0);


        const performanceData = (() => {
            if (!startDate || !endDate) return [];
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
             if (!startDate || !endDate) return true;
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
            
            const { from: startDate, to: endDate } = dateRange || {};
            const filteredRecords = records.filter(r => {
                if (!startDate || !endDate) return true;
                const recordDate = parseISO(r.date);
                const start = new Date(startDate);
                start.setHours(0,0,0,0);
                const end = new Date(endDate);
                end.setHours(23,59,59,999);
                return recordDate >= start && recordDate <= end;
            });

            if (filteredRecords.length === 0) {
                 toast({
                    variant: 'destructive',
                    title: 'Sem dados no período',
                    description: 'Não há registros no período selecionado para gerar o relatório.'
                });
                setIsFleetLoading(false);
                return;
            }

            const generatedReport = await generateReport({
                records: filteredRecords,
                dieselPrices,
                period: "weekly",
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setFileCallback: (file: File | null) => void) => {
        if (event.target.files) {
            setFileCallback(event.target.files[0]);
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
            let fileDataUri: string;
            const fileType = file.type;

            const isSheet = fileType.includes('spreadsheet') || fileType.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

            if (isSheet) {
                 fileDataUri = await processSheetFile(file);
            } else {
                 fileDataUri = await fileToDataURI(file);
            }
            
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
            description: 'A IA não conseguiu processar o arquivo. Verifique se o formato é suportado (planilha, PDF, imagem) e se o conteúdo é legível. Tente novamente.',
          });
        } finally {
          setIsSheetLoading(false);
        }
    };

    const handleGeneratePresentation = async () => {
        if (!repositoryContent && !repositoryFile) {
            toast({
                variant: 'destructive',
                title: 'Nenhum conteúdo fornecido',
                description: 'Por favor, adicione anotações ou um arquivo para gerar o resumo.',
            });
            return;
        }

        setIsPresentationLoading(true);
        setPresentationResult(null);

        try {
            let fileDataUri: string | undefined = undefined;
            if (repositoryFile) {
                fileDataUri = await fileToDataURI(repositoryFile);
            }

            const input: PresentationInput = {
                repositoryContent: repositoryContent || undefined,
                fileDataUri: fileDataUri,
            };

            const result = await generatePresentationSummary(input);
            setPresentationResult(result);

        } catch (error) {
            console.error('Failed to generate presentation', error);
            toast({
                variant: 'destructive',
                title: 'Erro na Geração',
                description: 'A IA não conseguiu processar o conteúdo. Tente novamente.',
            });
        } finally {
            setIsPresentationLoading(false);
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
                                    <div className="text-2xl font-bold">{dbStats.vehicles.count.toLocaleString('pt-BR')}</div>
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
                                    <div className="text-2xl font-bold">{dbStats.fueling.count.toLocaleString('pt-BR')}</div>
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
                                    <div className="text-2xl font-bold">{dbStats.maintenance.count.toLocaleString('pt-BR')}</div>
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
                                    <div className="text-2xl font-bold">{dbStats.diesel.count.toLocaleString('pt-BR')}</div>
                                    <p className="text-xs text-muted-foreground">Preços salvos</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>
            </Card>

        <Accordion type="multiple" className="w-full" defaultValue={['item-1']}>
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
                                                "w-[260px] justify-start text-left font-normal",
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
                                <div className="flex items-center gap-2">
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 })})}>Esta Semana</Button>
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 15), to: new Date()})}>Últimos 15 dias</Button>
                                     <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>Este Mês</Button>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5">
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
                                           Estimativa de custo calculada usando a fórmula: (KM Total / Consumo do Veículo) * Último Preço do Diesel. O consumo é a meta 'Verde' específica de cada veículo, ou 2.5 KM/L se não houver parâmetro.
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
             
            <AccordionItem value="item-2">
                 <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <Wand2 /> Análise Preditiva e Cruzamento de Dados
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card className="shadow-lg mt-2 border-0">
                        <CardHeader>
                            <CardTitle>Gerador de Relatórios de Frota</CardTitle>
                            <CardDescription>A IA analisa os dados de viagem e gera insights acionáveis sobre anomalias e tendências.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(records.length === 0 || dieselPrices.length === 0) ? (
                                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50 rounded-lg">
                                    <p>
                                        <span className="font-semibold text-foreground">Ação necessária:</span> Para gerar o relatório, é preciso ter registros de viagem e pelo menos um preço de diesel cadastrado.
                                    </p>
                                    <p className="mt-2">
                                        Vá para a página de <Button variant="link" className="p-0 h-auto" asChild><a href="/admin/records">Registros</a></Button> para adicionar viagens ou para <Button variant="link" className="p-0 h-auto" asChild><a href="/admin/settings">Configurações</a></Button> para adicionar o preço do diesel.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        A análise usará o período de datas selecionado no filtro de desempenho acima: 
                                        <span className="font-semibold text-foreground">
                                            {dateRange?.from ? format(dateRange.from, 'dd/MM/yy') : ''} à {dateRange?.to ? format(dateRange.to, 'dd/MM/yy') : ''}
                                        </span>
                                    </p>
                                    <Button onClick={handleGenerateFleetReport} disabled={isFleetLoading} className="w-full sm:w-auto">
                                        {isFleetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                        {isFleetLoading ? "Analisando Frota..." : "Gerar Relatório de Frota"}
                                    </Button>
                                </>
                            )}
                             {fleetReport && (
                                <Card className="mt-6 bg-muted/20">
                                    <CardHeader>
                                        <CardTitle>Relatório da Frota Gerado</CardTitle>
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
                                <FileText /> Análise de Documentos (OCR)
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Card className="shadow-lg mt-2 border-0">
                                <CardHeader>
                                    <CardTitle>Análise Inteligente de Documentos</CardTitle>
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
                                            onValueChange={(value: string) => setAnalysisType(value)}
                                            disabled={isSheetLoading}
                                        >
                                            <SelectTrigger id="analysis-type">
                                            <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Análise de Atestados Médicos">Análise de Atestados Médicos</SelectItem>
                                                <SelectItem value="Análise de Manutenção de Frota">Análise de Manutenção de Frota</SelectItem>
                                                <SelectItem value="Análise de Viagens Atrasadas/Não Realizadas">Viagens Atrasadas/Não Realizadas</SelectItem>
                                                <SelectItem value="Análise de Outras Ocorrências">Outras Ocorrências</SelectItem>
                                                <SelectItem value="Análise de RH">Análise de RH</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </div>
                                        <div className="space-y-2">
                                        <Label htmlFor="sheet-upload">Arquivo do Documento</Label>
                                        <div className="relative">
                                            <Input
                                                id="sheet-upload"
                                                type="file"
                                                accept=".xlsx, .xls, .csv, image/*, application/pdf"
                                                onChange={(e) => handleFileChange(e, setFile)}
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
                                                disabled={isPresentationLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="repository-upload">Upload de Arquivos de Apoio</Label>
                                             <div className="relative mt-2">
                                                <Input
                                                    id="repository-upload"
                                                    type="file"
                                                    onChange={(e) => handleFileChange(e, setRepositoryFile)}
                                                    className="pr-12"
                                                    disabled={isPresentationLoading}
                                                />
                                                <Upload className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            </div>
                                            {repositoryFile && <p className="text-sm text-muted-foreground mt-2">Arquivo selecionado: {repositoryFile.name}</p>}
                                        </div>
                                         <Button onClick={handleGeneratePresentation} disabled={isPresentationLoading || (!repositoryContent && !repositoryFile)} className="w-full">
                                            {isPresentationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                            {isPresentationLoading ? 'Gerando Resumo...' : 'Gerar Resumo da Apresentação com IA'}
                                        </Button>
                                    </div>
                                </CardContent>
                                {presentationResult && (
                                     <Card className="mt-6 bg-muted/20 mx-6 mb-6">
                                        <CardHeader>
                                            <CardTitle>{presentationResult.title}</CardTitle>
                                            <CardDescription>Abaixo o resumo gerado pela IA para sua apresentação.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-lg"><ListChecks /> Resumo Executivo</h3>
                                                <Textarea readOnly value={presentationResult.summary} className="h-24 bg-background" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-lg"><BarChart2 /> Pontos de Discussão</h3>
                                                 <ul className="list-disc list-inside space-y-1 bg-background p-4 rounded-md">
                                                    {presentationResult.talkingPoints.map((point, index) => (
                                                        <li key={index}>{point}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-lg"><Lightbulb /> Próximos Passos</h3>
                                                <ul className="list-disc list-inside space-y-1 bg-background p-4 rounded-md">
                                                    {presentationResult.nextSteps.map((step, index) => (
                                                        <li key={index}>{step}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                        </Card>
                        </AccordionContent>
                    </AccordionItem>
                </>
            )}
        </Accordion>
    </div>
  );
}
