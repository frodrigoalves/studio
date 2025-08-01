
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getFuelingRecords, type FuelingRecord } from '@/services/fueling';
import { getRecords, type Record as TripRecord } from '@/services/records';
import { parseISO, format, isBefore, isAfter, compareAsc } from 'date-fns';

type AuditStatus = {
    status: 'ok' | 'pending' | 'discrepancy';
    message: string;
};

interface EnhancedFuelingRecord extends FuelingRecord {
    previousTripOdometer?: number | null;
    nextTripOdometer?: number | null;
    auditStatus: AuditStatus;
}

export default function FuelingRecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<EnhancedFuelingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const [fuelingData, tripData] = await Promise.all([
                getFuelingRecords(),
                getRecords()
            ]);

            const tripRecordsByCar = new Map<string, TripRecord[]>();
            tripData.forEach(trip => {
                if (!tripRecordsByCar.has(trip.car)) {
                    tripRecordsByCar.set(trip.car, []);
                }
                tripRecordsByCar.get(trip.car)!.push(trip);
            });
            
             tripRecordsByCar.forEach(trips => trips.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date))));

            const enhancedFuelingData = fuelingData.map(fuelingRecord => {
                const carTrips = tripRecordsByCar.get(fuelingRecord.carId) || [];
                const fuelingDate = parseISO(fuelingRecord.date);
                
                const previousTrip = carTrips
                    .filter(trip => trip.kmEnd && isBefore(parseISO(trip.date), fuelingDate))
                    .pop();

                const nextTrip = carTrips
                    .find(trip => trip.kmStart && isAfter(parseISO(trip.date), fuelingDate));

                const attendantKm = fuelingRecord.odometer;
                const prevKm = previousTrip?.kmEnd;
                const nextKm = nextTrip?.kmStart;

                let auditStatus: AuditStatus;
                const prevDiscrepancy = prevKm != null && attendantKm !== prevKm;
                const nextDiscrepancy = nextKm != null && attendantKm !== nextKm;

                if (prevDiscrepancy && nextDiscrepancy) {
                    auditStatus = { status: 'discrepancy', message: 'Divergência dupla: KM\'s anterior e seguinte não batem.' };
                } else if (prevDiscrepancy) {
                    auditStatus = { status: 'discrepancy', message: 'KM Abastecimento diferente do KM Final anterior.' };
                } else if (nextDiscrepancy) {
                    auditStatus = { status: 'discrepancy', message: 'KM Inicial seguinte diferente do KM Abastecimento.' };
                } else if (prevKm != null && nextKm == null) {
                    auditStatus = { status: 'pending', message: 'Aguardando próxima viagem para auditoria completa.' };
                } else {
                    auditStatus = { status: 'ok', message: 'KM reconciliado com sucesso.' };
                }


                return {
                    ...fuelingRecord,
                    previousTripOdometer: prevKm,
                    nextTripOdometer: nextKm,
                    auditStatus
                };
            });

            setRecords(enhancedFuelingData);

        } catch (error) {
            console.error("Failed to fetch records", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar registros',
                description: 'Não foi possível buscar os dados do servidor.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const getStatusBadge = (audit: AuditStatus) => {
        let badge: JSX.Element;
        let badgeText: string;

        switch (audit.status) {
            case 'ok':
                badgeText = "OK";
                badge = <Badge variant="default" className="bg-green-100 text-green-800 flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3"/> {badgeText}</Badge>;
                break;
            case 'pending':
                badgeText = "Pendente";
                badge = <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center justify-center gap-1"><Clock className="h-3 w-3"/> {badgeText}</Badge>;
                break;
            case 'discrepancy':
                badgeText = "Divergência";
                badge = <Badge variant="destructive" className="flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3"/> {badgeText}</Badge>;
                break;
            default:
                badgeText = "N/A";
                badge = <Badge>{badgeText}</Badge>;
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {badge}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{audit.message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria de Abastecimento e KM</CardTitle>
        <CardDescription>
            Compare o KM registrado pelo motorista (antes e depois) com o KM registrado no abastecimento para identificar percursos não autorizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Data e Hora</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden md:table-cell">Abastecedor</TableHead>
              <TableHead className="text-center whitespace-nowrap">KM Motorista (Anterior)</TableHead>
              <TableHead className="text-center whitespace-nowrap">KM Abastecedor</TableHead>
              <TableHead className="text-center whitespace-nowrap">KM Motorista (Posterior)</TableHead>
              <TableHead className="text-center">Status Auditoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            ) : records.map((record) => {
                const attendantKm = record.odometer;
                const prevKm = record.previousTripOdometer;
                const nextKm = record.nextTripOdometer;

                const hasDiscrepancy = record.auditStatus.status === 'discrepancy';

                const renderCell = (kmValue: number | null | undefined, isDivergent: boolean) => (
                    <TableCell className={`text-center font-mono transition-colors duration-300 ${isDivergent ? 'text-destructive' : ''}`}>
                         <div className="flex items-center justify-center gap-1.5">
                             {isDivergent && <AlertTriangle className="h-4 w-4" />}
                             <span className={isDivergent ? 'font-bold' : ''}>
                                {kmValue?.toLocaleString('pt-BR') ?? 'N/A'}
                             </span>
                         </div>
                    </TableCell>
                );

                return (
                  <TableRow key={record.id} className={hasDiscrepancy ? 'bg-destructive/5' : ''}>
                    <TableCell className="whitespace-nowrap">
                        {format(parseISO(record.date), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{record.carId}</TableCell>
                    <TableCell className="hidden md:table-cell">{record.attendantName}</TableCell>
                    
                    {renderCell(prevKm, hasDiscrepancy && record.auditStatus.message.includes('anterior'))}
                    {renderCell(attendantKm, hasDiscrepancy)}
                    {renderCell(nextKm, hasDiscrepancy && record.auditStatus.message.includes('seguinte'))}
                    
                    <TableCell className="text-center">{getStatusBadge(record.auditStatus)}</TableCell>

                  </TableRow>
                )
            })}
             {!isLoading && records.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum registro de abastecimento encontrado.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    