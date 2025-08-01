
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getChecklistRecords, type ChecklistRecord } from '@/services/checklist';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ChecklistRecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<ChecklistRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<ChecklistRecord | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const fetchedRecords = await getChecklistRecords();
            setRecords(fetchedRecords);
        } catch (error) {
            console.error("Failed to fetch checklist records", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar registros',
                description: 'Não foi possível buscar os dados de vistoria do servidor.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const openDetailsDialog = (record: ChecklistRecord) => {
        setSelectedRecord(record);
        setIsDetailsOpen(true);
    };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Registros de Vistoria</CardTitle>
        <CardDescription>Visualize todas as vistorias de pré-viagem realizadas pelos motoristas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden sm:table-cell">Motorista</TableHead>
              <TableHead className="hidden sm:table-cell">Chapa</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell>{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                <TableCell className="font-medium">{record.carId}</TableCell>
                <TableCell className="hidden sm:table-cell">{record.driverName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{record.driverChapa}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {record.observations ? (
                    <Badge variant="destructive" className="flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Com Observações
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> OK
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetailsDialog(record)}>
                        Ver Detalhes
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && records.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum registro de vistoria encontrado.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Vistoria</DialogTitle>
          <DialogDescription>
            Vistoria do carro <span className="font-semibold">{selectedRecord?.carId}</span> por <span className="font-semibold">{selectedRecord?.driverName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Itens Verificados</h4>
            <ul className="list-disc list-inside pl-2 text-sm text-muted-foreground">
              {selectedRecord && Object.entries(selectedRecord.items).map(([key, value]) => (
                value && <li key={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</li>
              ))}
            </ul>
          </div>
          {selectedRecord?.observations && (
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-destructive"/> Observações do Motorista</h4>
              <p className="text-sm bg-muted p-3 rounded-md border">{selectedRecord.observations}</p>
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
