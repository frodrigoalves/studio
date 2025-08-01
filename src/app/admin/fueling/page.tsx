
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getFuelingRecords, type FuelingRecord } from '@/services/fueling';
import { getRecords, type Record as TripRecord } from '@/services/records';
import { parseISO, format, isBefore } from 'date-fns';

interface EnhancedFuelingRecord extends FuelingRecord {
    lastDriverOdometer?: number | null;
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

            const enhancedFuelingData = fuelingData.map(fuelingRecord => {
                const carTrips = tripRecordsByCar.get(fuelingRecord.carId) || [];
                const fuelingDate = parseISO(fuelingRecord.date);
                
                const lastRelevantTrip = carTrips
                    .filter(trip => trip.kmEnd && isBefore(parseISO(trip.date), fuelingDate))
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    [0];

                return {
                    ...fuelingRecord,
                    lastDriverOdometer: lastRelevantTrip?.kmEnd
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros de Abastecimento</CardTitle>
        <CardDescription>Visualize e audite todos os registros de abastecimento da frota.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden sm:table-cell">Abastecedor</TableHead>
              <TableHead className="hidden sm:table-cell">Chapa</TableHead>
              <TableHead className="text-center">Hodômetro Abastecedor</TableHead>
              <TableHead className="text-center">KM Motorista (Anterior)</TableHead>
              <TableHead className="text-right">Litros</TableHead>
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
                const hasDiscrepancy = record.lastDriverOdometer && record.odometer !== record.lastDriverOdometer;
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                        {format(parseISO(record.date), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{record.carId}</TableCell>
                    <TableCell className="hidden sm:table-cell">{record.attendantName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{record.attendantChapa}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{record.odometer.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className={`text-center ${hasDiscrepancy ? 'text-destructive font-bold' : ''}`}>
                         <div className="flex items-center justify-center gap-2">
                             {hasDiscrepancy && <AlertTriangle className="h-4 w-4" />}
                             <span>{record.lastDriverOdometer?.toLocaleString('pt-BR') ?? 'N/A'}</span>
                         </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{record.liters.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L</TableCell>
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
