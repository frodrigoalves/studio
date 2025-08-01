
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getFuelingRecords, type FuelingRecord } from '@/services/fueling';

export default function FuelingRecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<FuelingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const fetchedRecords = await getFuelingRecords();
            setRecords(fetchedRecords);
        } catch (error) {
            console.error("Failed to fetch fueling records", error);
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
        <CardDescription>Visualize todos os registros de abastecimento da frota.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden sm:table-cell">Abastecedor</TableHead>
              <TableHead className="hidden sm:table-cell">Chapa</TableHead>
              <TableHead className="text-center">Bomba</TableHead>
              <TableHead className="text-right">Hodômetro</TableHead>
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
            ) : records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                <TableCell className="font-medium">{record.carId}</TableCell>
                <TableCell className="hidden sm:table-cell">{record.attendantName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{record.attendantChapa}</Badge>
                </TableCell>
                <TableCell className="text-center">{record.pump}</TableCell>
                <TableCell className="text-right">{record.odometer.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right font-semibold">{record.liters.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L</TableCell>
              </TableRow>
            ))}
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
