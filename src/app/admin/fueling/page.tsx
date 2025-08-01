
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown, FileText, Send } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getFuelingRecords, type FuelingRecord } from '@/services/fueling';
import { parseISO, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


export default function FuelingRecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<FuelingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const fuelingData = await getFuelingRecords();
            setRecords(fuelingData);
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

    const getExportData = () => {
        return records.map(r => ({
            'Data': format(parseISO(r.date), 'dd/MM/yy HH:mm'),
            'Carro': r.carId,
            'Abastecedor': r.attendantName,
            'Bomba': r.pump,
            'KM Registrado': r.odometer,
            'Litros': r.liters,
        }));
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Abastecimentos");
        XLSX.writeFile(workbook, "registros_abastecimento.xlsx");
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
                doc.text("Relatório de Abastecimentos", data.settings.margin.left, 15);
            },
        });
        doc.save('registros_abastecimento.pdf');
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
        link.setAttribute("download", "registros_abastecimento.txt");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Exportação Concluída", description: "O arquivo TXT foi baixado." });
    };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Registros de Abastecimento</CardTitle>
                <CardDescription>
                    Visualize todos os abastecimentos registrados.
                </CardDescription>
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
