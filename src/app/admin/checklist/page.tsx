
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, MessageSquare, CameraOff, FileDown, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getChecklistRecords, type ChecklistRecord, type ChecklistItemStatus } from '@/services/checklist';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const statusDisplay: Record<ChecklistItemStatus, { text: string, className: string }> = {
    ok: { text: "OK", className: "text-green-600" },
    avaria: { text: "Avaria", className: "text-destructive font-bold" },
    na: { text: "N/A", className: "text-muted-foreground" },
};

const PhotoDisplay = ({ label, url }: { label: string; url: string | null | undefined }) => (
    <div className="space-y-2">
        <h4 className="font-semibold text-center">{label}</h4>
        {url ? (
            <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image src={url} alt={label} layout="fill" objectFit="contain" />
            </div>
        ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground">
                <CameraOff className="h-12 w-12 mb-2" />
                <span>Nenhuma foto encontrada.</span>
            </div>
        )}
    </div>
);

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

    const hasAllPhotos = (record: ChecklistRecord) => {
        return record.odometerPhoto && record.frontDiagonalPhoto && record.rearDiagonalPhoto && record.leftSidePhoto && record.rightSidePhoto;
    }

    const photoCollection = selectedRecord ? [
        { label: "Hodômetro", url: selectedRecord.odometerPhoto },
        { label: "Diagonal Frontal", url: selectedRecord.frontDiagonalPhoto },
        { label: "Diagonal Traseira", url: selectedRecord.rearDiagonalPhoto },
        { label: "Lateral Esquerda", url: selectedRecord.leftSidePhoto },
        { label: "Lateral Direita", url: selectedRecord.rightSidePhoto },
    ].filter(p => p.url) : [];


    const getExportData = () => {
        return records.flatMap(r => 
            Object.entries(r.items).map(([item, status]) => ({
                'Data': new Date(r.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                'Carro': r.carId,
                'Motorista': r.driverName,
                'Item': item,
                'Status': status,
                'Observações': r.observations || '',
            }))
        );
    };

    const formatDataAsText = (data: ReturnType<typeof getExportData>) => {
        if (data.length === 0) return "";
        let text = "";
        const headers = Object.keys(data[0]);
        text += headers.join('\t') + '\r\n';
        data.forEach(row => {
            text += headers.map(header => row[header as keyof typeof row] ?? '').join('\t') + '\r\n';
        });
        return text;
    };


    const handleExportXLSX = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para exportar" });
            return;
        }
        const data = getExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vistorias");
        XLSX.writeFile(workbook, "registros_vistoria.xlsx");
        toast({ title: "Exportação Concluída", description: "O arquivo XLSX foi baixado."});
    };
    
    const handleExportPDF = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para exportar" });
            return;
        }
        const doc = new jsPDF();
        const tableData = getExportData();
        const tableColumn = Object.keys(tableData[0]);
        const tableRows = tableData.map(obj => tableColumn.map(key => obj[key as keyof typeof obj] ?? ''));

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            didDrawPage: (data: any) => {
                doc.setFontSize(20);
                doc.text("Relatório de Vistorias", data.settings.margin.left, 15);
            },
        });
        doc.save('registros_vistoria.pdf');
        toast({ title: "Exportação Concluída", description: "O arquivo PDF foi baixado."});
    };
    
    const handleExportTXT = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para exportar" });
            return;
        }
        const data = getExportData();
        const textData = formatDataAsText(data);
        const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "registros_vistoria.txt");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Exportação Concluída", description: "O arquivo TXT foi baixado." });
    };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Registros de Vistoria</CardTitle>
                <CardDescription>Visualize todas as vistorias de pré-viagem realizadas pelos motoristas.</CardDescription>
            </div>
             <div className="flex gap-2 w-full sm:w-auto">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Opções de Exportação</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportXLSX}>
                            <FileText className="mr-2 h-4 w-4" />
                            Exportar para XLSX
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={handleExportPDF}>
                            <FileText className="mr-2 h-4 w-4" />
                            Exportar para PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportTXT}>
                            <FileText className="mr-2 h-4 w-4" />
                            Exportar para TXT
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="hidden sm:table-cell">Motorista</TableHead>
              <TableHead className="text-center">Status</TableHead>
               <TableHead className="text-center">Fotos</TableHead>
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
                <TableCell className="text-center">
                  {record.hasIssue ? (
                    <Badge variant="destructive" className="flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Com Avaria
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> OK
                    </Badge>
                  )}
                </TableCell>
                 <TableCell className="text-center">
                  {!hasAllPhotos(record) ? (
                    <Badge variant="destructive" className="flex items-center justify-center gap-1">
                      <CameraOff className="h-3 w-3" /> Incompleto
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completo
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Vistoria</DialogTitle>
          <DialogDescription>
            Vistoria do carro <span className="font-semibold">{selectedRecord?.carId}</span> por <span className="font-semibold">{selectedRecord?.driverName}</span> em {selectedRecord?.date ? new Date(selectedRecord.date).toLocaleString('pt-BR', {timeZone: 'UTC'}) : ''}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
        <div className="py-4 space-y-6 pr-6">
            {photoCollection.length > 0 && (
                <div>
                     <h4 className="font-semibold mb-2">Fotos da Vistoria</h4>
                     <Carousel className="w-full">
                        <CarouselContent>
                            {photoCollection.map((photo, index) => (
                                <CarouselItem key={index}>
                                    <div className="p-1">
                                        <PhotoDisplay label={photo.label} url={photo.url} />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                </div>
            )}
          <div>
            <h4 className="font-semibold mb-2">Itens Verificados</h4>
            <div className="h-72 w-full rounded-md border">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {selectedRecord && Object.entries(selectedRecord.items).map(([key, value]) => {
                            const status = statusDisplay[value];
                            return (
                                <TableRow key={key}>
                                    <TableCell>{key}</TableCell>
                                    <TableCell className={cn("text-right font-medium", status.className)}>
                                        {status.text}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
          </div>
          {selectedRecord?.observations && (
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2"><MessageSquare className={cn("h-4 w-4", selectedRecord.hasIssue && "text-destructive")}/> Observações do Motorista</h4>
              <p className="text-sm bg-muted p-3 rounded-md border">{selectedRecord.observations}</p>
            </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
