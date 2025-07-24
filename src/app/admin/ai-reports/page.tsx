
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecords, type Record } from "@/services/records";
import { getDieselPrices, type DieselPrice } from "@/services/settings";
import { generateReport, type ReportOutput } from "@/ai/flows/report-flow";


type Period = "daily" | "weekly" | "monthly";

export default function AiReportsPage() {
    const { toast } = useToast();
    const [period, setPeriod] = useState<Period>("weekly");
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<ReportOutput | null>(null);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setReport(null);
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
                period,
            });
            setReport(generatedReport);

        } catch (error) {
            console.error("Failed to generate report", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao gerar relatório',
                description: 'A IA não conseguiu processar os dados. Tente novamente.'
            });
        } finally {
            setIsLoading(false);
        }
    };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-4">
                     <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 mb-4 border-2 border-primary/20 w-fit">
                        <Sparkles className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                        <CardTitle>Gerador de Relatórios com IA</CardTitle>
                        <CardDescription>Selecione o período e deixe a IA analisar os dados e gerar insights para você.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-auto flex-1 space-y-2">
                        <Label htmlFor="period">Período de Análise</Label>
                        <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
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
                    <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                        {isLoading ? "Gerando..." : "Gerar Relatório"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {report && (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório Gerado</CardTitle>
                     <CardDescription>
                        Análise para o período: <span className="font-semibold capitalize">{period.replace('daily', 'diário').replace('weekly', 'semanal').replace('monthly', 'mensal')}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">📄 Resumo Executivo</h3>
                        <Textarea readOnly value={report.summary} className="h-24 bg-muted/50" />
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold text-lg">📈 Análise de Tendências</h3>
                        <Textarea readOnly value={report.trends} className="h-32 bg-muted/50" />
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold text-lg">💡 Recomendações</h3>
                        <Textarea readOnly value={report.recommendations} className="h-32 bg-muted/50" />
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
