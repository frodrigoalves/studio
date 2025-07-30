
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Upload, Wand2, FileUp, Wrench, Fuel } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDieselPrices, saveDieselPrice, type DieselPrice } from "@/services/settings";
import { processVehicleParameters, type VehicleParametersOutput } from "@/ai/flows/vehicle-parameters-flow";
import { saveVehicleParameters } from "@/services/vehicles";
import { addFuelingRecords, type FuelingRecordPayload } from "@/services/fueling";
import { addMaintenanceRecords } from "@/services/maintenance";
import * as XLSX from 'xlsx';

const fileToDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export default function SettingsPage() {
    const { toast } = useToast();
    const [prices, setPrices] = useState<DieselPrice[]>([]);
    const [isLoadingPrices, setIsLoadingPrices] = useState(true);
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

    const [parametersFile, setParametersFile] = useState<File | null>(null);
    const [isParametersLoading, setIsParametersLoading] = useState(false);

    const [fuelingFile, setFuelingFile] = useState<File | null>(null);
    const [isFuelingLoading, setIsFuelingLoading] = useState(false);
    
    const [maintenanceFile, setMaintenanceFile] = useState<File | null>(null);
    const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);


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
            fetchPrices(); // Refresh data

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
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, selecione um arquivo de mapeamento.'});
            return;
        }
        setIsParametersLoading(true);
        try {
            const fileDataUri = await fileToDataURI(parametersFile);
            const result: VehicleParametersOutput = await processVehicleParameters({ fileDataUri });

            if (result.vehicles.length > 0) {
                await saveVehicleParameters(result.vehicles);
                 toast({ title: 'Mapeamento Salvo', description: `${result.vehicles.length} parâmetros de veículos foram salvos com sucesso.`});
            } else {
                 toast({ variant: 'destructive', title: 'Nenhum dado encontrado', description: 'A IA não conseguiu extrair parâmetros do arquivo. Verifique o conteúdo e o formato.'});
            }

            setParametersFile(null);
            const fileInput = document.getElementById('parameters-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error) {
             console.error("Error processing parameters file", error);
             toast({ variant: 'destructive', title: 'Erro ao processar arquivo', description: 'Ocorreu um erro ao processar o mapeamento. Tente novamente.'});
        } finally {
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
                        date: row['Data'] ? new Date((row['Data'] - (25567 + 1)) * 86400 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        car: String(row['Carro'] ?? ''),
                        liters: Number(row['Litros'] ?? 0),
                        pricePerLiter: Number(row['Preço/Litro'] ?? 0),
                    })).filter(r => r.car && r.liters > 0);

                    if (fuelingRecords.length === 0) {
                         toast({ variant: 'destructive', title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha possui as colunas "Data", "Carro", "Litros" e "Preço/Litro" e se os dados estão corretos.'});
                         setIsFuelingLoading(false);
                         return;
                    }
                    
                    await addFuelingRecords(fuelingRecords);
                    toast({ title: 'Importação Concluída', description: `${fuelingRecords.length} registros de abastecimento foram importados com sucesso.`});
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

                    const maintenanceRecords = json.map(row => ({
                        car: String(row['Carro'] ?? ''),
                        reason: String(row['Motivo'] ?? 'Manutenção'),
                        startDate: row['Data Início'] ? new Date((row['Data Início'] - (25567 + 1)) * 86400 * 1000).toISOString() : new Date().toISOString(),
                    })).filter(r => r.car);

                    if (maintenanceRecords.length === 0) {
                         toast({ variant: 'destructive', title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha possui as colunas "Carro", "Motivo" e "Data Início".'});
                         setIsMaintenanceLoading(false);
                         return;
                    }
                    
                    await addMaintenanceRecords(maintenanceRecords);
                    toast({ title: 'Importação Concluída', description: `${maintenanceRecords.length} registros de manutenção foram importados com sucesso.`});
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
    }


    return (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 max-w-6xl mx-auto">
            <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Valor do Diesel</CardTitle>
                        <CardDescription>Adicione ou atualize o valor do litro do diesel. O valor mais recente será usado nos cálculos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSavePrice}>
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
                            <Button type="submit" className="w-full" disabled={isSavingPrice}>
                                {isSavingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSavingPrice ? "Salvando..." : "Salvar Preço"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Preços</CardTitle>
                        <CardDescription>Valores do diesel registrados anteriormente.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            </div>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Parâmetros de Consumo por Veículo</CardTitle>
                    <CardDescription>Faça o upload de uma planilha (XLSX ou PDF) com os parâmetros de consumo (metas) para cada veículo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg">
                        <p className="font-semibold">Instruções para a Planilha:</p>
                        <ul className="list-disc list-inside mt-2">
                            <li>O arquivo deve conter as colunas: <strong>VEICULO</strong>, <strong>AMARELA</strong>, <strong>VERDE</strong>, <strong>DOURADA</strong>.</li>
                            <li>A coluna "VEICULO" deve ter o número do carro.</li>
                            <li>As colunas de metas devem conter o valor de KM/L esperado para cada faixa.</li>
                        </ul>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="space-y-2 w-full sm:w-auto flex-grow">
                            <Label htmlFor="parameters-upload">Arquivo de Mapeamento</Label>
                            <div className="relative">
                                <Input
                                    id="parameters-upload"
                                    type="file"
                                    accept=".xlsx, .xls, .pdf"
                                    onChange={(e) => handleFileChange(e, setParametersFile)}
                                    disabled={isParametersLoading}
                                    className="pr-12"
                                />
                                <FileUp className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                        <Button onClick={handleProcessParameters} disabled={isParametersLoading || !parametersFile}>
                            {isParametersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            {isParametersLoading ? "Processando..." : "Processar Parâmetros"}
                        </Button>
                   </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Importação de Dados de Abastecimento</CardTitle>
                    <CardDescription>Faça o upload de uma planilha (XLSX ou CSV) com os registros de abastecimento para calcular o consumo real.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg">
                        <p className="font-semibold">Instruções para a Planilha:</p>
                        <ul className="list-disc list-inside mt-2">
                            <li>O arquivo deve ter as colunas: <strong>Data</strong>, <strong>Carro</strong>, <strong>Litros</strong>, <strong>Preço/Litro</strong>.</li>
                            <li>"Carro" deve ser o número do veículo correspondente aos registros de viagem.</li>
                        </ul>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4 items-end">
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
                        <Button onClick={handleImportFuelingData} disabled={isFuelingLoading || !fuelingFile}>
                            {isFuelingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Fuel className="mr-2 h-4 w-4"/>}
                            {isFuelingLoading ? "Importando..." : "Importar Abastecimentos"}
                        </Button>
                   </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Registro de Veículos em Manutenção</CardTitle>
                    <CardDescription>Faça o upload de uma planilha com a lista de veículos que estão atualmente em manutenção ou reparo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg">
                        <p className="font-semibold">Instruções para a Planilha:</p>
                        <ul className="list-disc list-inside mt-2">
                            <li>O arquivo deve ter as colunas: <strong>Carro</strong>, <strong>Motivo</strong>, <strong>Data Início</strong>.</li>
                            <li>A coluna "Carro" deve conter o número do veículo.</li>
                        </ul>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4 items-end">
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
                        <Button onClick={handleImportMaintenanceData} disabled={isMaintenanceLoading || !maintenanceFile}>
                            {isMaintenanceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wrench className="mr-2 h-4 w-4"/>}
                            {isMaintenanceLoading ? "Importando..." : "Importar Manutenções"}
                        </Button>
                   </div>
                </CardContent>
            </Card>

        </div>
    )
}
