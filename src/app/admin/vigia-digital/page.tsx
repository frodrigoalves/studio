
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, Search, Eye, ThumbsUp } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getChecklistRecordsWithDamage, acknowledgeDamage, type ChecklistRecordWithDamage } from '@/services/checklist';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


const severityMap: Record<string, { className: string; text: string }> = {
    low: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Baixa' },
    medium: { className: 'bg-orange-100 text-orange-800 border-orange-300', text: 'Média' },
    high: { className: 'bg-red-200 text-red-800 border-red-500', text: 'Alta' },
    none: { className: 'bg-green-100 text-green-800 border-green-300', text: 'Nenhum' },
};

const PhotoComparison = ({ label, oldUrl, newUrl }: { label: string; oldUrl: string; newUrl: string }) => (
    <div className="space-y-2">
        <h4 className="text-lg font-semibold text-center mb-2">{label}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <p className="text-sm font-medium text-center text-muted-foreground">Vistoria Anterior</p>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                    <Image src={oldUrl} alt={`Vistoria anterior - ${label}`} layout="fill" objectFit="contain" />
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium text-center text-muted-foreground">Vistoria Atual (com Dano)</p>
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-destructive">
                    <Image src={newUrl} alt={`Vistoria atual - ${label}`} layout="fill" objectFit="contain" />
                </div>
            </div>
        </div>
    </div>
);


export default function VigiaDigitalPage() {
    const { toast } = useToast();
    const [alerts, setAlerts] = useState<ChecklistRecordWithDamage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<ChecklistRecordWithDamage | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const fetchedAlerts = await getChecklistRecordsWithDamage();
            setAlerts(fetchedAlerts);
        } catch (error) {
            console.error("Failed to fetch damage alerts", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar alertas',
                description: 'Não foi possível buscar os dados de danos do servidor.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const openDetailsDialog = (alert: ChecklistRecordWithDamage) => {
        setSelectedAlert(alert);
        setIsDetailsOpen(true);
    };

    const handleAcknowledge = async (alertId: string) => {
        try {
            await acknowledgeDamage(alertId);
            toast({
                title: 'Alerta Resolvido',
                description: 'O alerta de dano foi marcado como ciente.',
            });
            fetchAlerts(); // Refresh the list
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar',
                description: 'Não foi possível marcar o alerta como ciente.',
            });
        }
    };
    
    const pendingAlerts = alerts.filter(a => !a.damageAnalysis?.acknowledged);
    const acknowledgedAlerts = alerts.filter(a => a.damageAnalysis?.acknowledged);

    return (
        <>
            <div className="space-y-8">
                <Card className="border-destructive/50">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                            <div>
                                <CardTitle>Alertas de Dano Pendentes ({pendingAlerts.length})</CardTitle>
                                <CardDescription>Novos danos detectados pela IA que requerem sua atenção.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : pendingAlerts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                                <p className="font-medium">Nenhum alerta de dano pendente!</p>
                                <p className="text-sm">O sistema não detectou novas avarias nas últimas vistorias.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingAlerts.map((alert) => (
                                    <Card key={alert.id} className="flex flex-col">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                     <CardTitle className="text-lg">Carro: {alert.carId}</CardTitle>
                                                     <CardDescription>{new Date(alert.date).toLocaleString('pt-BR', { timeZone: 'UTC' })}</CardDescription>
                                                </div>
                                                <Badge className={cn(severityMap[alert.damageAnalysis.severity]?.className)}>
                                                    Prioridade: {severityMap[alert.damageAnalysis.severity]?.text}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm border-l-4 border-muted-foreground/20 pl-4 py-2 bg-muted/50 rounded-r-md">
                                                {alert.damageAnalysis.damageDescription}
                                            </p>
                                        </CardContent>
                                        <div className="p-4 pt-0 flex flex-col sm:flex-row gap-2">
                                            <Button variant="outline" className="w-full" onClick={() => openDetailsDialog(alert)}>
                                                <Eye className="mr-2 h-4 w-4"/> Ver Detalhes
                                            </Button>
                                            <Button className="w-full" onClick={() => handleAcknowledge(alert.id)}>
                                                <ThumbsUp className="mr-2 h-4 w-4"/> Marcar Ciente
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Alertas</CardTitle>
                        <CardDescription>Alertas de danos que já foram marcados como cientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : acknowledgedAlerts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                <p>Nenhum alerta foi resolvido ainda.</p>
                            </div>
                        ) : (
                             <ul className="space-y-3">
                                {acknowledgedAlerts.map((alert) => (
                                     <li key={alert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div className="flex-grow">
                                            <p className="font-semibold">
                                                Carro {alert.carId} - <span className="text-muted-foreground font-normal">{alert.damageAnalysis.damageDescription}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Detectado em: {new Date(alert.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} por {alert.driverName}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => openDetailsDialog(alert)}>
                                           Ver Detalhes
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

             <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Análise de Dano - Carro {selectedAlert?.carId}</DialogTitle>
                        <DialogDescription>
                            Comparativo de fotos entre a vistoria anterior e a atual.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6 max-h-[80vh] overflow-y-auto pr-4">
                       <div className="p-4 rounded-lg bg-background border">
                            <h3 className="font-semibold mb-2">Relatório da IA</h3>
                            <p className="text-sm"><strong>Motorista (Vistoria Atual):</strong> {selectedAlert?.driverName}</p>
                            <p className="text-sm"><strong>Data da Detecção:</strong> {selectedAlert?.date ? new Date(selectedAlert.date).toLocaleString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</p>
                            <p className="text-sm"><strong>Descrição do Dano:</strong> {selectedAlert?.damageAnalysis.damageDescription}</p>
                            <p className="text-sm flex items-center gap-2">
                                <strong>Severidade:</strong> 
                                <Badge className={cn(severityMap[selectedAlert?.damageAnalysis.severity ?? 'none']?.className)}>
                                    {severityMap[selectedAlert?.damageAnalysis.severity ?? 'none']?.text}
                                </Badge>
                            </p>
                            <p className="text-sm"><strong>Confiança da Análise:</strong> {(selectedAlert?.damageAnalysis.confidenceScore ?? 0 * 100).toFixed(0)}%</p>
                       </div>
                        
                        <Separator />
                       
                        {selectedAlert?.previousChecklistPhotos && (
                            <div className="space-y-6">
                                <PhotoComparison 
                                    label="Diagonal Frontal"
                                    oldUrl={selectedAlert.previousChecklistPhotos.front}
                                    newUrl={selectedAlert.frontDiagonalPhoto!}
                                />
                                <PhotoComparison 
                                    label="Diagonal Traseira"
                                    oldUrl={selectedAlert.previousChecklistPhotos.rear}
                                    newUrl={selectedAlert.rearDiagonalPhoto!}
                                />
                                <PhotoComparison 
                                    label="Lateral Esquerda"
                                    oldUrl={selectedAlert.previousChecklistPhotos.left}
                                    newUrl={selectedAlert.leftSidePhoto!}
                                />
                                <PhotoComparison 
                                    label="Lateral Direita"
                                    oldUrl={selectedAlert.previousChecklistPhotos.right}
                                    newUrl={selectedAlert.rightSidePhoto!}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}


    