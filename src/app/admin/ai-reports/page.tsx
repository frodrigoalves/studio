
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2, FileText, Upload, Lightbulb, ListChecks, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecords } from "@/services/records";
import { getDieselPrices } from "@/services/settings";
import { generateReport, type ReportOutput } from "@/ai/flows/report-flow";
import { analyseSheet, type SheetAnalysisInput, type SheetAnalysisOutput } from "@/ai/flows/sheet-analysis-flow";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type Period = "daily" | "weekly" | "monthly";
type AnalysisType = 'hr' | 'maintenance';

export default function AiReportsPage() {
    const { toast } = useToast();
    
    // State for Fleet Report
    const [fleetPeriod, setFleetPeriod] = useState<Period>("weekly");
    const [isFleetLoading, setIsFleetLoading] = useState(false);
    const [fleetReport, setFleetReport] = useState<ReportOutput | null>(null);

    // State for Sheet Analysis
    const [analysisType, setAnalysisType] = useState<AnalysisType>('hr');
    const [file, setFile] = useState<File | null>(null);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    const [sheetAnalysisResult, setSheetAnalysisResult] = useState<SheetAnalysisOutput | null>(null);


    const handleGenerateFleetReport = async () => {
        setIsFleetLoading(true);
        setFleetReport(null);
        try {
            const [records, dieselPrices] = await Promise.all([
                getRecords(),
                getDieselPrices()
            ]);

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
            const selectedFile = event.target.files[0];
            if (selectedFile.type !== 'text/csv') {
                toast({
                    variant: 'destructive',
                    title: 'Formato Inválido',
                    description: 'Por favor, envie apenas arquivos no formato CSV.'
                });
                setFile(null);
                event.target.value = ''; // Reset file input
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleGenerateSheetAnalysis = async () => {
        if (!file) {
          toast({
            variant: 'destructive',
            title: 'Nenhum arquivo selecionado',
            description: 'Por favor, faça o upload de uma planilha para análise.',
          });
          return;
        }
    
        setIsSheetLoading(true);
        setSheetAnalysisResult(null);
    
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const sheetContent = e.target?.result as string;
            
            const analysisInput: SheetAnalysisInput = {
              sheetContent,
              analysisType,
              // tripRecords: await getRecords(), // Adicionar opção para cruzamento de dados no futuro
            };
            
            const result = await analyseSheet(analysisInput);
            setSheetAnalysisResult(result);
          };
          reader.readAsText(file);
    
        } catch (error) {
          console.error('Failed to analyze sheet', error);
          toast({
            variant: 'destructive',
            title: 'Erro na Análise',
            description:
              'A IA não conseguiu processar a planilha. Verifique o arquivo e tente novamente.',
          });
        } finally {
          setIsSheetLoading(false);
        }
      };


  return (
    <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
            <div className="inline-block bg-primary/10 text-primary rounded-full p-4 border-2 border-primary/20">
                <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">Central de Inteligência</h1>
            <p className="text-muted-foreground">Gere análises de frota ou faça upload de planilhas para obter insights com IA.</p>
        </div>

        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
                 <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <FileText /> Análise de Frota
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card className="shadow-lg mt-2">
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
            <AccordionItem value="item-2">
                <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-2">
                        <Upload /> Análise de Planilhas
                    </div>
                </AccordionTrigger>
                 <AccordionContent>
                     <Card className="shadow-lg mt-2">
                        <CardHeader>
                            <CardTitle>Análise Inteligente de Planilhas</CardTitle>
                            <CardDescription>
                                Faça o upload de planilhas de RH (atestados) ou Manutenção para que a IA identifique anomalias e tendências.
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
                                <Label htmlFor="sheet-upload">Planilha (somente .csv)</Label>
                                <div className="relative">
                                    <Input
                                        id="sheet-upload"
                                        type="file"
                                        accept=".csv"
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
                                {isSheetLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Wand2 className="mr-2 h-4 w-4" />
                                )}
                                {isSheetLoading ? 'Analisando Planilha...' : 'Analisar Planilha com IA'}
                            </Button>

                            {sheetAnalysisResult && (
                                <Card className="mt-6 bg-muted/20">
                                    <CardHeader>
                                        <CardTitle>{sheetAnalysisResult.title}</CardTitle>
                                        <CardDescription>
                                            Abaixo estão os insights gerados pela IA com base no arquivo enviado.
                                        </CardDescription>
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
        </Accordion>
    </div>
  );
}
