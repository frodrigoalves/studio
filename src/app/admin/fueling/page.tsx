
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, Clock, Fuel } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getFuelingRecords, type FuelingRecord } from '@/services/fueling';
import { parseISO, format } from 'date-fns';

// --- LÓGICA DE AUDITORIA DESABILITADA TEMPORARIAMENTE ---
/*
import { getRecords, type Record as TripRecord } from '@/services/records';
import { isBefore, isAfter, compareAsc } from 'date-fns';

type AuditStatus = {
    status: 'ok' | 'pending' | 'discrepancy';
    message: string;
};

interface EnhancedFuelingRecord extends FuelingRecord {
    previousTripOdometer?: number | null;
    nextTripOdometer?: number | null;
    auditStatus: AuditStatus;
}
*/

export default function FuelingRecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<FuelingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const fuelingData = await getFuelingRecords();
            setRecords(fuelingData);

            // --- LÓGICA DE AUDITORIA DESABILITADA TEMPORARIAMENTE ---
            /*
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
            */

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros de Abastecimento</CardTitle>
        <CardDescription>
            Visualize todos os abastecimentos registrados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Data e Hora</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden md:table-cell">Abastecedor</TableHead>
              <TableHead className="text-center">Bomba</TableHead>
              <TableHead className="text-center whitespace-nowrap">KM Registrado</TableHead>
              <TableHead className="text-right whitespace-nowrap">Litros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            ) : records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                        {format(parseISO(record.date), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{record.carId}</TableCell>
                    <TableCell className="hidden md:table-cell">{record.attendantName}</TableCell>
                    <TableCell className="text-center">{record.pump}</TableCell>
                    <TableCell className="text-center font-mono">{record.odometer.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-medium">{record.liters.toLocaleString('pt-BR')} L</TableCell>
                  </TableRow>
            ))}
             {!isLoading && records.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
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
