
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, FileUp, Camera, AlertCircle, KeyRound, Loader2, Upload, FileDown, FileText, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { getRecords, addRecord, updateRecord, type Record, type RecordAddPayload } from '@/services/records';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

type NewRecordState = Omit<Record, 'id' | 'status' | 'startOdometerPhoto' | 'endOdometerPhoto'> & {
    startOdometerPhoto: File | null;
    endOdometerPhoto: File | null;
};

export default function RecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<Record[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isPhotosDialogOpen, setPhotosDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
    const [authPassword, setAuthPassword] = useState('');
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const startPhotoInputRef = useRef<HTMLInputElement>(null);
    const endPhotoInputRef = useRef<HTMLInputElement>(null);
    
    const initialNewRecordState: NewRecordState = {
        date: new Date().toISOString().split('T')[0],
        driver: '',
        car: '',
        plate: '',
        line: '',
        kmStart: null,
        kmEnd: null,
        startOdometerPhoto: null,
        endOdometerPhoto: null,
    };

    const [newRecord, setNewRecord] = useState<NewRecordState>(initialNewRecordState);
    
    const [editRecordData, setEditRecordData] = useState<Record | null>(null);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const fetchedRecords = await getRecords();
            setRecords(fetchedRecords);
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

    const handleAddRecord = async () => {
      if (newRecord.kmEnd && newRecord.kmStart && newRecord.kmEnd <= newRecord.kmStart) {
        toast({
            variant: "destructive",
            title: "KM Final inválido",
            description: "O KM final deve ser maior que o KM inicial.",
        });
        return;
      }
      setIsSaving(true);
      try {
        const startPhotoBase64 = newRecord.startOdometerPhoto ? await fileToBase64(newRecord.startOdometerPhoto) : null;
        const endPhotoBase64 = newRecord.endOdometerPhoto ? await fileToBase64(newRecord.endOdometerPhoto) : null;

        const newRecordPayload: RecordAddPayload = {
          ...newRecord,
          kmStart: newRecord.kmStart ? Number(newRecord.kmStart) : null,
          kmEnd: newRecord.kmEnd ? Number(newRecord.kmEnd) : null,
          status: newRecord.kmEnd ? "Finalizado" : "Em Andamento",
          startOdometerPhoto: startPhotoBase64,
          endOdometerPhoto: endPhotoBase64,
        };
      
        await addRecord(newRecordPayload);
        setAddDialogOpen(false);
        setNewRecord(initialNewRecordState);
        if(startPhotoInputRef.current) startPhotoInputRef.current.value = "";
        if(endPhotoInputRef.current) endPhotoInputRef.current.value = "";
        fetchRecords();
        toast({ title: "Sucesso!", description: "Registro adicionado com sucesso." });
      } catch (error) {
        console.error("Failed to add record", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível adicionar o registro." });
      } finally {
        setIsSaving(false);
      }
    }
    
    const handleUpdateRecord = async () => {
        if (!editRecordData) return;
        setIsSaving(true);
        try {
            const { id, ...dataToUpdate } = {
                ...editRecordData,
                kmStart: editRecordData.kmStart ? Number(editRecordData.kmStart) : null,
                kmEnd: editRecordData.kmEnd ? Number(editRecordData.kmEnd) : null,
                status: editRecordData.kmEnd ? "Finalizado" : "Em Andamento" as "Finalizado" | "Em Andamento",
            };
            
            await updateRecord(id, dataToUpdate);
            setEditDialogOpen(false);
            setEditRecordData(null);
            fetchRecords(); // Refresh data
            toast({ title: "Sucesso!", description: "Registro atualizado com sucesso." });
        } catch (error) {
             toast({ variant: 'destructive', title: "Erro", description: "Não foi possível atualizar o registro." });
        } finally {
            setIsSaving(false);
        }
    }

    const openPhotosDialog = (record: Record) => {
        setSelectedRecord(record);
        setPhotosDialogOpen(true);
    };
    
    const openEditDialog = (record: Record) => {
        setSelectedRecord(record);
        setAuthDialogOpen(true);
    }
    
    const handleAuthorization = async () => {
        setIsAuthorizing(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate check
        setIsAuthorizing(false);

        if (authPassword === 'diretoria') {
            setAuthDialogOpen(false);
            setAuthPassword('');
            if (selectedRecord) {
                setEditRecordData(selectedRecord);
                setEditDialogOpen(true);
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'A senha da diretoria está incorreta.',
            });
        }
    };
    
    const getExportData = () => {
        return records.map(r => ({
            'Data': new Date(r.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            'Motorista': r.driver,
            'Veículo': r.car,
            'Linha': r.line,
            'Chapa': r.plate,
            'KM Início': r.kmStart,
            'KM Fim': r.kmEnd,
            'KM Total': (r.kmEnd && r.kmStart) ? r.kmEnd - r.kmStart : 0,
            'Status': r.status,
        }));
    };

    const handleExportXLSX = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para exportar" });
            return;
        }
        const data = getExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");
        XLSX.writeFile(workbook, "registros_viagens.xlsx");
        toast({ title: "Exportação Concluída", description: "O arquivo XLSX foi baixado."});
    };
    
    const handleExportPDF = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para exportar" });
            return;
        }
        const doc = new jsPDF();
        const tableData = getExportData();
        const tableColumn = ["Data", "Motorista", "Veículo", "Linha", "Chapa", "KM Início", "KM Fim", "KM Total", "Status"];
        const tableRows = tableData.map(obj => tableColumn.map(key => obj[key as keyof typeof obj] ?? ''));

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            didDrawPage: (data: any) => {
                doc.setFontSize(20);
                doc.text("Relatório de Registros de Viagem", data.settings.margin.left, 15);
            },
        });
        doc.save('registros_viagens.pdf');
        toast({ title: "Exportação Concluída", description: "O arquivo PDF foi baixado."});
    };

    const handleSendEmail = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para enviar" });
            return;
        }
        const data = getExportData();
        const subject = "Relatório de Registros de Viagens";
        let body = "Segue o relatório de registros de viagens:\n\n";
        
        const headers = Object.keys(data[0]);
        body += headers.join('\t|\t') + '\n';
        body += '-'.repeat(headers.join('\t|\t').length * 1.5) + '\n';
        
        data.forEach(row => {
            body += Object.values(row).join('\t|\t') + '\n';
        });

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        toast({ title: "E-mail Pronto", description: "Seu cliente de e-mail foi aberto."});
    };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Registros de Viagens</CardTitle>
                <CardDescription>Visualize e gerencie todos os registros de hodômetro.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-1/2 sm:w-auto">
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
                        <DropdownMenuItem onClick={handleSendEmail}>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar por Email
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-1/2 sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Registro</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da viagem manualmente, incluindo as fotos do odômetro.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="driver">Motorista</Label>
                                <Input id="driver" value={newRecord.driver} onChange={(e) => setNewRecord({...newRecord, driver: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plate">Chapa</Label>
                                <Input id="plate" value={newRecord.plate} onChange={(e) => setNewRecord({...newRecord, plate: e.target.value})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="car">Veículo</Label>
                                <Input id="car" value={newRecord.car} onChange={(e) => setNewRecord({...newRecord, car: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="line">Linha</Label>
                                <Input id="line" value={newRecord.line} onChange={(e) => setNewRecord({...newRecord, line: e.target.value})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="date">Data</Label>
                                <Input id="date" type="date" value={newRecord.date} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="kmStart">KM Início</Label>
                                <Input id="kmStart" type="number" value={newRecord.kmStart ?? ''} onChange={(e) => setNewRecord({...newRecord, kmStart: e.target.value === '' ? null : e.target.valueAsNumber})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="kmEnd">KM Fim</Label>
                                <Input id="kmEnd" type="number" value={newRecord.kmEnd ?? ''} onChange={(e) => setNewRecord({...newRecord, kmEnd: e.target.value === '' ? null : e.target.valueAsNumber})} />
                            </div>
                            <div className="space-y-2 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                        <Label htmlFor="startOdometerPhoto">Foto Odômetro (Início)</Label>
                                        <Input id="startOdometerPhoto" type="file" accept="image/*" ref={startPhotoInputRef} onChange={(e) => setNewRecord({...newRecord, startOdometerPhoto: e.target.files ? e.target.files[0] : null})} />
                                </div>
                                <div className="space-y-2">
                                        <Label htmlFor="endOdometerPhoto">Foto Odômetro (Fim)</Label>
                                        <Input id="endOdometerPhoto" type="file" accept="image/*" ref={endPhotoInputRef} onChange={(e) => setNewRecord({...newRecord, endOdometerPhoto: e.target.files ? e.target.files[0] : null})} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddRecord} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? "Salvando..." : "Salvar Registro"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead className="hidden md:table-cell">Veículo</TableHead>
              <TableHead className="hidden md:table-cell">Linha</TableHead>
              <TableHead>Chapa</TableHead>
              <TableHead className="text-right hidden lg:table-cell">KM Início</TableHead>
              <TableHead className="text-right hidden lg:table-cell">KM Fim</TableHead>
              <TableHead className="text-right">KM Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={10} className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                </TableRow>
            ) : records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="hidden sm:table-cell">{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</TableCell>
                <TableCell className="font-medium">{record.driver}</TableCell>
                <TableCell className="hidden md:table-cell">{record.car}</TableCell>
                <TableCell className="hidden md:table-cell">{record.line}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{record.plate}</Badge>
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell">{record.kmStart ?? "—"}</TableCell>
                <TableCell className="text-right hidden lg:table-cell">{record.kmEnd ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">
                    {(record.kmEnd && record.kmStart) ? `${record.kmEnd - record.kmStart} km` : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={record.status === "Finalizado" ? "default" : "outline"} className={record.status === "Finalizado" ? "bg-green-100 text-green-800" : ""}>
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditDialog(record)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPhotosDialog(record)}>Ver Fotos</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isPhotosDialogOpen} onOpenChange={setPhotosDialogOpen}>
        <DialogContent className="sm:max-w-[80vw] md:max-w-[60vw] lg:max-w-[50vw]">
            <DialogHeader>
                <DialogTitle>Fotos do Odômetro</DialogTitle>
                <DialogDescription>
                    Fotos registradas para a viagem de {selectedRecord?.driver} com a chapa {selectedRecord?.plate}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <h4 className="font-semibold text-center">Início da Viagem</h4>
                    {selectedRecord?.startOdometerPhoto ? (
                        <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                            <Image src={selectedRecord.startOdometerPhoto} alt="Odômetro Início" layout="fill" objectFit="contain" />
                        </div>
                    ) : (
                         <div className="aspect-video flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground">
                            <Camera className="h-12 w-12 mb-2" />
                            <span>Nenhuma foto encontrada.</span>
                        </div>
                    )}
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold text-center">Fim da Viagem</h4>
                     {selectedRecord?.endOdometerPhoto ? (
                        <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                            <Image src={selectedRecord.endOdometerPhoto} alt="Odômetro Fim" layout="fill" objectFit="contain" />
                        </div>
                    ) : (
                         <div className="aspect-video flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground">
                             {selectedRecord?.status === "Finalizado" ? (
                                <>
                                    <Camera className="h-12 w-12 mb-2" />
                                    <span>Nenhuma foto encontrada.</span>
                                </>
                             ) : (
                                <>
                                    <AlertCircle className="h-12 w-12 mb-2" />
                                    <span>Viagem ainda em andamento.</span>
                                </>
                             )}
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPhotosDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>
                    <div className="flex items-center gap-2">
                        <KeyRound /> Autorização Necessária
                    </div>
                </DialogTitle>
                <DialogDescription>
                   Para editar este registro, por favor, insira a senha da diretoria.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="auth-password">Senha da Diretoria</Label>
                    <Input id="auth-password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuthorization()} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setAuthDialogOpen(false); setAuthPassword('')}}>Cancelar</Button>
                <Button onClick={handleAuthorization} disabled={isAuthorizing}>
                    {isAuthorizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Autorizar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Editar Registro</DialogTitle>
                <DialogDescription>
                    Modifique os detalhes da viagem. Apenas campos editáveis são mostrados.
                </DialogDescription>
            </DialogHeader>
            {editRecordData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-driver">Motorista</Label>
                        <Input id="edit-driver" value={editRecordData.driver} onChange={(e) => setEditRecordData({...editRecordData, driver: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-plate">Chapa</Label>
                        <Input id="edit-plate" value={editRecordData.plate} onChange={(e) => setEditRecordData({...editRecordData, plate: e.target.value})} />
                    </div>
                   <div className="space-y-2">
                        <Label htmlFor="edit-car">Veículo</Label>
                        <Input id="edit-car" value={editRecordData.car} onChange={(e) => setEditRecordData({...editRecordData, car: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-line">Linha</Label>
                        <Input id="edit-line" value={editRecordData.line} onChange={(e) => setEditRecordData({...editRecordData, line: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-date">Data</Label>
                        <Input id="edit-date" type="date" value={editRecordData.date} onChange={(e) => setEditRecordData({...editRecordData, date: e.target.value})} />
                    </div>
                   <div className="space-y-2">
                        <Label htmlFor="edit-kmStart">KM Início</Label>
                        <Input id="edit-kmStart" type="number" value={editRecordData.kmStart ?? ''} onChange={(e) => setEditRecordData({...editRecordData, kmStart: e.target.value === '' ? null : Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="edit-kmEnd">KM Fim</Label>
                        <Input id="edit-kmEnd" type="number" value={editRecordData.kmEnd ?? ''} onChange={(e) => setEditRecordData({...editRecordData, kmEnd: e.target.value === '' ? null : Number(e.target.value)})} />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdateRecord} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

    

    

    