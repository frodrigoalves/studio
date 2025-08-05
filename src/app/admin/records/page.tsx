
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, FileUp, Camera, AlertCircle, KeyRound, Loader2, Upload, FileDown, FileText, Send, Trash2, Fuel, Car } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { getRecords, addRecord, updateRecord, deleteRecord, type Record, type RecordAddPayload, RecordUpdatePayload } from '@/services/records';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

type NewRecordState = Omit<RecordAddPayload, 'startOdometerPhoto' | 'endOdometerPhoto' | 'status'> & {
    startOdometerPhotoFile: File | null;
    endOdometerPhotoFile: File | null;
};

export default function RecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<Record[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isPhotosDialogOpen, setPhotosDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
    const [authPassword, setAuthPassword] = useState('');
    const [authAction, setAuthAction] = useState<'edit' | 'delete' | null>(null);
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const startPhotoInputRef = useRef<HTMLInputElement>(null);
    const endPhotoInputRef = useRef<HTMLInputElement>(null);
    
    const initialNewRecordState: NewRecordState = {
        date: new Date().toISOString(),
        driver: '',
        car: '',
        plate: '',
        line: '',
        kmStart: null,
        kmEnd: null,
        startOdometerPhotoFile: null,
        endOdometerPhotoFile: null,
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
        const startPhotoBase64 = newRecord.startOdometerPhotoFile ? await fileToBase64(newRecord.startOdometerPhotoFile) : null;
        const endPhotoBase64 = newRecord.endOdometerPhotoFile ? await fileToBase64(newRecord.endOdometerPhotoFile) : null;

        const newRecordPayload: RecordAddPayload = {
          ...newRecord,
          date: new Date(newRecord.date).toISOString(),
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

            const payload: RecordUpdatePayload = {
                date: new Date(dataToUpdate.date).toISOString(),
                driver: dataToUpdate.driver,
                car: dataToUpdate.car,
                plate: dataToUpdate.plate,
                line: dataToUpdate.line,
                kmStart: dataToUpdate.kmStart,
                kmEnd: dataToUpdate.kmEnd,
                status: dataToUpdate.status,
            };
            
            await updateRecord(id, payload);
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
    
    const handleDeleteRecord = async () => {
        if (!selectedRecord) return;
        setIsDeleting(true);
        try {
            await deleteRecord(selectedRecord.id);
            setDeleteDialogOpen(false);
            setSelectedRecord(null);
            fetchRecords();
            toast({ title: "Registro Apagado", description: "O registro foi apagado permanentemente."});
        } catch (error) {
            console.error("Failed to delete record", error);
            toast({ variant: 'destructive', title: "Erro ao Apagar", description: "Não foi possível apagar o registro." });
        } finally {
            setIsDeleting(false);
        }
    }

    const openPhotosDialog = (record: Record) => {
        setSelectedRecord(record);
        setPhotosDialogOpen(true);
    };
    
    const openAuthDialog = (record: Record, action: 'edit' | 'delete') => {
        setSelectedRecord(record);
        setAuthAction(action);
        setAuthDialogOpen(true);
    }
    
    const handleAuthorization = async () => {
        setIsAuthorizing(true);
        // This should be a real check, but for now, it's a hardcoded password.
        const directorPasswords = ["sol@123"]; 
        if (directorPasswords.includes(authPassword)) {
            setAuthDialogOpen(false);
            setAuthPassword('');
            if (authAction === 'edit' && selectedRecord) {
                setEditRecordData(selectedRecord);
                setEditDialogOpen(true);
            } else if (authAction === 'delete' && selectedRecord) {
                setDeleteDialogOpen(true);
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'A senha da diretoria está incorreta.',
            });
        }
         setIsAuthorizing(false);
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");
        XLSX.writeFile(workbook, "registros_km.xlsx");
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
                doc.text("Relatório de Registros de KM", data.settings.margin.left, 15);
            },
        });
        doc.save('registros_km.pdf');
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
        link.setAttribute("download", "registros_km.txt");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Exportação Concluída", description: "O arquivo TXT foi baixado." });
    };

    const handleSendEmail = () => {
        if (records.length === 0) {
            toast({ title: "Nenhum dado para enviar" });
            return;
        }
        const data = getExportData();
        const subject = "Relatório de Registros de KM";
        const body = formatDataAsText(data);

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        toast({ title: "E-mail Pronto", description: "Seu cliente de e-mail foi aberto."});
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
                    <Camera className="h-12 w-12 mb-2" />
                    <span>Nenhuma foto encontrada.</span>
                </div>
            )}
        </div>
    );

    const photoCollection = selectedRecord ? [
        { label: "Hodômetro (Início)", url: selectedRecord.startOdometerPhoto },
        { label: "Hodômetro (Fim)", url: selectedRecord.endOdometerPhoto },
    ].filter(p => p.url) : [];


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Registros de KM</CardTitle>
                <CardDescription>Visualize e gerencie todos os registros de hodômetro.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSendEmail}>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar por Email
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
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
                                <Input id="date" type="date" value={new Date(newRecord.date).toISOString().split('T')[0]} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="kmStart">KM Início</Label>
                                <Input id="kmStart" type="number" value={newRecord.kmStart ?? ''} onChange={(e) => setNewRecord({...newRecord, kmStart: e.target.value === '' ? null : Number(e.target.value)})} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="kmEnd">KM Fim</Label>
                                <Input id="kmEnd" type="number" value={newRecord.kmEnd ?? ''} onChange={(e) => setNewRecord({...newRecord, kmEnd: e.target.value === '' ? null : Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                        <Label htmlFor="startOdometerPhoto">Foto Odômetro (Início)</Label>
                                        <Input id="startOdometerPhoto" type="file" accept="image/*" ref={startPhotoInputRef} onChange={(e) => setNewRecord({...newRecord, startOdometerPhotoFile: e.target.files ? e.target.files[0] : null})} />
                                </div>
                                <div className="space-y-2">
                                        <Label htmlFor="endOdometerPhoto">Foto Odômetro (Fim)</Label>
                                        <Input id="endOdometerPhoto" type="file" accept="image/*" ref={endPhotoInputRef} onChange={(e) => setNewRecord({...newRecord, endOdometerPhotoFile: e.target.files ? e.target.files[0] : null})} />
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
                      <DropdownMenuItem onClick={() => openAuthDialog(record, 'edit')}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPhotosDialog(record)} disabled={!record.startOdometerPhoto && !record.endOdometerPhoto}>Ver Fotos</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => openAuthDialog(record, 'delete')}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Apagar
                      </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Fotos da Jornada</DialogTitle>
                <DialogDescription>
                    Fotos registradas para a viagem de {selectedRecord?.driver} com o carro {selectedRecord?.car}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
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
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                </Carousel>
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
                   Para {authAction === 'edit' ? 'editar' : 'apagar'} este registro, por favor, insira a senha da diretoria.
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
    
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso apagará permanentemente o registro de viagem de{' '}
                    <span className="font-semibold">{selectedRecord?.driver}</span> com o carro{' '}
                    <span className="font-semibold">{selectedRecord?.car}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedRecord(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                     {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isDeleting ? 'Apagando...' : 'Apagar Permanentemente'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>


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
                        <Input id="edit-date" type="date" value={new Date(editRecordData.date).toISOString().split('T')[0]} onChange={(e) => setEditRecordData({...editRecordData, date: new Date(e.target.value).toISOString()})} />
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

    