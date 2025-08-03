
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Upload, FileUp, Wrench, Fuel, History, Database, Car, Droplets, Info, FileText, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDieselPrices, saveDieselPrice, type DieselPrice } from "@/services/settings";
import { saveVehicleParameters, getVehicleParameters, getMostRecentVehicleParameter, type VehicleParameters } from "@/services/vehicles";
import { addFuelingRecords, getFuelingRecords, getMostRecentFuelingRecord, FuelingRecordPayload } from "@/services/fueling";
import { addMaintenanceRecords, getMaintenanceRecords, getMostRecentMaintenanceRecord, MaintenanceRecordPayload } from "@/services/maintenance";
import * as XLSX from 'xlsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


export default function SettingsPage() {
    const { toast } = useToast();
    const [prices, setPrices] = useState<DieselPrice[]>([]);
    const [isLoadingPrices, setIsLoadingPrices] = useState(true);
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

    const [parametersFile, setParametersFile] = useState<File | null>(null);
    const [isParametersLoading, setIsParametersLoading] = useState(false);
    const [lastParametersImport, setLastParametersImport] = useState<string>('');
    const [parametersCount, setParametersCount] = useState(0);

    const [fuelingFile, setFuelingFile] = useState<File | null>(null);
    const [isFuelingLoading, setIsFuelingLoading] = useState(false);
    const [lastFuelingImport, setLastFuelingImport] = useState<string>('');
    const [fuelingCount, setFuelingCount] = useState(0);
    
    const [maintenanceFile, setMaintenanceFile] = useState<File | null>(null);
    const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
    const [lastMaintenanceImport, setLastMaintenanceImport] = useState<string>('');
    const [maintenanceCount, setMaintenanceCount] = useState(0);

    const fetchImportStats = async () => {
        try {
            const [
                lastVehicle, lastFueling, lastMaintenance,
                allVehicles, allFueling, allMaintenance
            ] = await Promise.all([
                getMostRecentVehicleParameter(),
                getMostRecentFuelingRecord(),
                getMostRecentMaintenanceRecord(),
                getVehicleParameters(),
                getFuelingRecords(),
                getMaintenanceRecords()
            ]);
            
            setLastParametersImport(lastVehicle?.lastUpdated || '');
            setParametersCount(allVehicles.length);
            setLastFuelingImport(lastFueling?.date || '');
            setFuelingCount(allFueling.length);
            setLastMaintenanceImport(lastMaintenance?.startDate || '');
            setMaintenanceCount(allMaintenance.length);

        } catch (error) {
            console.error("Failed to fetch import stats", error);
            toast({ variant: 'destructive', title: 'Erro ao carregar status das importações'});
        }
    }

    const fetchPrices = async () => {
        setIsLoadingPrices(true);
        try {
            const fetchedPrices = await getDieselPrices();
            setPrices(fetchedPrices);
        } catch (error) {
            console.error("Failed to fetch diesel prices", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar o histórico de preços.'
            });
        } finally {
            setIsLoadingPrices(false);
        }
    };
    
    useEffect(() => {
        fetchPrices();
        fetchImportStats();
    }, []);

    const handleSavePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceValue = parseFloat(newPrice);

        if (!newPrice || !newDate || isNaN(priceValue) || priceValue <= 0) {
            toast({
                variant: 'destructive',
                title: "Dados Inválidos",
                description: "Por favor, preencha o preço e a data corretamente."
            });
            return;
        }
        
        setIsSavingPrice(true);
        try {
            await saveDieselPrice({
                date: newDate,
                price: priceValue.toFixed(2),
            });
            
            setNewPrice('');
            setNewDate(new Date().toISOString().split('T')[0]);
            fetchPrices();

            toast({
                title: "Sucesso!",
                description: "O novo preço do diesel foi salvo."
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Erro ao Salvar",
                description: "Não foi possível salvar o novo preço. Tente novamente."
            });
        } finally {
            setIsSavingPrice(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setFileCallback: (file: File | null) => void) => {
        if (event.target.files) {
            setFileCallback(event.target.files[0]);
        }
    };

    const handleProcessParameters = async () => {
        if (!parametersFile) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, selecione um arquivo de parâmetros.'});
            return;
        }
        setIsParametersLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const vehicleParameters: Omit<VehicleParameters, 'status' | 'lastUpdated'>[] = json
                        .map(row => ({
                            carId: String(row['VEICULO'] ?? '').trim(),
                            thresholds: {
                                yellow: parseFloat(String(row['AMARELA'] ?? '0').replace(',', '.')) || 0,
                                green: parseFloat(String(row['VERDE'] ?? '0').replace(',', '.')) || 0,
                                gold: parseFloat(String(row['DOURADA'] ?? '0').replace(',', '.')) || 0,
                            },
                            tankCapacity: Number(row['CAPACIDADE TANQUE'] ?? 0) || undefined,
                        }))
                        .filter(p => p.carId && p.thresholds.green > 0); 

                    if (vehicleParameters.length === 0) {
                        toast({ variant: 'destructive', title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha possui as colunas corretas (VEICULO, VERDE, etc.) e se os dados estão preenchidos.'});
                        setIsParametersLoading(false);
                        return;
                    }

                    await saveVehicleParameters(vehicleParameters);
                    toast({ title: 'Parâmetros Salvos', description: `${vehicleParameters.length} parâmetros de veículos foram salvos/atualizados no banco de dados.`});
                    fetchImportStats();

                    setParametersFile(null);
                    const fileInput = document.getElementById('parameters-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';

                } catch (error) {
                    console.error("Error processing parameters file", error);
                    toast({ variant: 'destructive', title: 'Erro ao processar arquivo', description: `Ocorreu um erro ao ler a planilha: ${error instanceof Error ? error.message : String(error)}`});
                } finally {
                    setIsParametersLoading(false);
                }
            };
            reader.readAsBinaryString(parametersFile);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro na importação', description: 'Não foi possível iniciar a leitura do arquivo.'});
            setIsParametersLoading(false);
        }
    }

    const handleImportFuelingData = async () => {
        if (!fuelingFile) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, selecione um arquivo de abastecimento.'});
            return;
        }
        setIsFuelingLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const fuelingRecords: FuelingRecordPayload[] = json.map(row => ({
                        date: row['Data'] ? new Date((row['Data'] - (25567 + 1)) * 86400 * 1000).toISOString() : new Date().toISOString(),
                        carId: String(row['Carro'] ?? ''),
                        liters: Number(row['Litros'] ?? 0),
                        pricePerLiter: Number(row['Preço/Litro'] ?? 0),
                        attendantChapa: '', // Dados não disponíveis na planilha
                        attendantName: 'Importado', // Dados não disponíveis na planilha
                        odometer: 0, // Dados não disponíveis na planilha
                        pump: 0, // Dados não disponíveis na planilha
                    })).filter(r => r.carId && r.liters > 0);

                    if (fuelingRecords.length === 0) {
                         toast({ variant: 'destructive', title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha possui as colunas "Data", "Carro", "Litros" e "Preço/Litro" e se os dados estão corretos.'});
                         setIsFuelingLoading(false);
                         return;
                    }
                    
                    await addFuelingRecords(fuelingRecords);
                    toast({ title: 'Importação Concluída', description: `${fuelingRecords.length} registros de abastecimento foram salvos no banco de dados.`});
                    fetchImportStats();
                    setFuelingFile(null);
                    const fileInput = document.getElementById('fueling-upload') as HTMLInputElement;
                    if(fileInput) fileInput.value = '';

                } catch(error) {
                    console.error("Error processing fueling file", error);
                    toast({ variant: 'destructive', title: 'Erro ao processar arquivo', description: 'Verifique o formato do arquivo e os nomes das colunas (Data, Carro, Litros, Preço/Litro).'});
                } finally {
                    setIsFuelingLoading(false);
                }
            };
            reader.readAsBinaryString(fuelingFile);

        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Erro na importação', description: 'Ocorreu um erro inesperado. Tente novamente.'});
            setIsFuelingLoading(false);
        }
    }
    
    const handleImportMaintenanceData = async () => {
        if (!maintenanceFile) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, selecione um arquivo de manutenção.'});
            return;
        }
        setIsMaintenanceLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const maintenanceRecords: MaintenanceRecordPayload[] = json.map(row => ({
                        carId: String(row['Carro'] ?? ''),
                        reason: String(row['Motivo'] ?? 'Manutenção'),
                        startDate: row['Data Início'] ? new Date((row['Data Início'] - (25567 + 1)) * 86400 * 1000).toISOString() : new Date().toISOString(),
                    })).filter(r => r.carId);

                    if (maintenanceRecords.length === 0) {
                         toast({ variant: 'destructive', title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha possui as colunas "Carro", "Motivo" e "Data Início".'});
                         setIsMaintenanceLoading(false);
                         return;
                    }
                    
                    await addMaintenanceRecords(maintenanceRecords);
                    toast({ title: 'Importação Concluída', description: `${maintenanceRecords.length} registros de manutenção foram salvos no banco de dados.`});
                    fetchImportStats();
                    setMaintenanceFile(null);
                    const fileInput = document.getElementById('maintenance-upload') as HTMLInputElement;
                    if(fileInput) fileInput.value = '';

                } catch(error) {
                    console.error("Error processing maintenance file", error);
                    toast({ variant: 'destructive', title: 'Erro ao processar arquivo', description: 'Verifique o formato do arquivo e os nomes das colunas.'});
                } finally {
                    setIsMaintenanceLoading(false);
                }
            };
            reader.readAsBinaryString(maintenanceFile);
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Erro na importação', description: 'Ocorreu um erro inesperado. Tente novamente.'});
            setIsMaintenanceLoading(false);
        }
    };

    const renderImportStatus = (lastImportDate: string, recordCount: number) => {
        if (!lastImportDate) {
            return <p className="text-xs text-muted-foreground">Nenhuma importação encontrada.</p>;
        }

        const daysSinceImport = differenceInDays(new Date(), parseISO(lastImportDate));
        const formattedDate = format(parseISO(lastImportDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

        return (
            <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                    Última importação em: <span className="font-semibold">{formattedDate}</span> ({recordCount.toLocaleString('pt-BR')} registros).
                </p>
                {daysSinceImport > 30 && (
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-xs font-semibold">Atenção: Os dados estão há mais de 30 dias sem atualização.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="grid gap-6 max-w-6xl mx-auto">
             <Card>
                <CardHeader>
                    <CardTitle>Valor do Diesel</CardTitle>
                    <CardDescription>Adicione ou atualize o valor do litro do diesel. O valor mais recente será usado nos cálculos do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid sm:grid-cols-3 gap-4" onSubmit={handleSavePrice}>
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço por Litro (R$)</Label>
                            <Input 
                                id="price" 
                                type="number" 
                                step="0.01" 
                                placeholder="5.50" 
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                disabled={isSavingPrice}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Data de Vigência</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                disabled={isSavingPrice}
                            />
                        </div>
                        <Button type="submit" className="w-full self-end" disabled={isSavingPrice}>
                            {isSavingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isSavingPrice ? "Salvando..." : "Salvar Preço"}
                        </Button>
                    </form>
                    <Accordion type="single" collapsible className="w-full mt-4">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <History className="h-4 w-4" /> Ver Histórico de Preços
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead className="text-right">Preço (R$)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingPrices ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center">
                                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                                </TableCell>
                                            </TableRow>
                                        ) : prices.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</TableCell>
                                                <TableCell className="text-right font-mono">{Number(item.price).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Importação de Dados Essenciais</CardTitle>
                    <CardDescription>Faça o upload de planilhas (XLSX, CSV) para alimentar o banco de dados com os parâmetros que servem de base para as análises de custo e desempenho.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        <AccordionItem value="item-1" className="border rounded-lg px-4">
                             <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                     <Car className="h-6 w-6" />
                                     <div>
                                         <h4 className="font-semibold text-base">Parâmetros de Veículos</h4>
                                         <p className="text-xs text-muted-foreground text-left">Metas de consumo e capacidade do tanque.</p>
                                     </div>
                                 </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg space-y-2">
                                    <p className="font-semibold text-foreground">Instruções para a Planilha:</p>
                                    <ul className="list-disc list-inside">
                                        <li>Colunas necessárias: <strong>VEICULO</strong>, <strong>AMARELA</strong>, <strong>VERDE</strong>, <strong>DOURADA</strong>, e <strong>CAPACIDADE TANQUE</strong>.</li>
                                        <li>A coluna "VEICULO" deve ter o número do carro, que servirá como identificador único.</li>
                                    </ul>
                               </div>
                               <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
                                    <div className="space-y-2 w-full sm:w-auto flex-grow">
                                        <Label htmlFor="parameters-upload">Arquivo de Parâmetros</Label>
                                        <div className="relative">
                                            <Input
                                                id="parameters-upload"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={(e) => handleFileChange(e, setParametersFile)}
                                                disabled={isParametersLoading}
                                                className="pr-12"
                                            />
                                            <FileUp className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <Button onClick={handleProcessParameters} disabled={isParametersLoading || !parametersFile} className="w-full sm:w-auto">
                                        {isParametersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        {isParametersLoading ? "Processando..." : "Importar"}
                                    </Button>
                               </div>
                               <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                                    {renderImportStatus(lastParametersImport, parametersCount)}
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-2" className="border rounded-lg px-4">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                     <Fuel className="h-6 w-6" />
                                     <div>
                                         <h4 className="font-semibold text-base">Dados de Abastecimento</h4>
                                         <p className="text-xs text-muted-foreground text-left">Registros de todos os abastecimentos realizados.</p>
                                     </div>
                                 </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg space-y-2">
                                     <p className="font-semibold text-foreground">Instruções para a Planilha:</p>
                                     <ul className="list-disc list-inside">
                                         <li>Colunas necessárias: <strong>Data</strong>, <strong>Carro</strong>, <strong>Litros</strong>, <strong>Preço/Litro</strong>.</li>
                                     </ul>
                                </div>
                               <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
                                    <div className="space-y-2 w-full sm:w-auto flex-grow">
                                        <Label htmlFor="fueling-upload">Planilha de Abastecimento</Label>
                                        <div className="relative">
                                            <Input
                                                id="fueling-upload"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={(e) => handleFileChange(e, setFuelingFile)}
                                                disabled={isFuelingLoading}
                                                className="pr-12"
                                            />
                                            <FileUp className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <Button onClick={handleImportFuelingData} disabled={isFuelingLoading || !fuelingFile} className="w-full sm:w-auto">
                                        {isFuelingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        {isFuelingLoading ? "Importando..." : "Importar"}
                                    </Button>
                               </div>
                                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                                    {renderImportStatus(lastFuelingImport, fuelingCount)}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border rounded-lg px-4">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                     <Wrench className="h-6 w-6" />
                                     <div>
                                         <h4 className="font-semibold text-base">Veículos em Manutenção</h4>
                                         <p className="text-xs text-muted-foreground text-left">Lista de veículos que entraram em manutenção.</p>
                                     </div>
                                 </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                               <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg space-y-2">
                                    <p className="font-semibold text-foreground">Instruções para a Planilha:</p>
                                    <ul className="list-disc list-inside">
                                        <li>Colunas necessárias: <strong>Carro</strong>, <strong>Motivo</strong>, <strong>Data Início</strong>.</li>
                                    </ul>
                               </div>
                               <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
                                    <div className="space-y-2 w-full sm:w-auto flex-grow">
                                        <Label htmlFor="maintenance-upload">Planilha de Manutenção</Label>
                                        <div className="relative">
                                            <Input
                                                id="maintenance-upload"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={(e) => handleFileChange(e, setMaintenanceFile)}
                                                disabled={isMaintenanceLoading}
                                                className="pr-12"
                                            />
                                            <FileUp className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <Button onClick={handleImportMaintenanceData} disabled={isMaintenanceLoading || !maintenanceFile} className="w-full sm:w-auto">
                                        {isMaintenanceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        {isMaintenanceLoading ? "Importando..." : "Importar"}
                                    </Button>
                               </div>
                                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                                    {renderImportStatus(lastMaintenanceImport, maintenanceCount)}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    )
}
