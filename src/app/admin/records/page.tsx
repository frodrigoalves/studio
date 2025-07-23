
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, FileUp, Camera, AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

interface Record {
  id: number;
  date: string;
  driver: string;
  car: string;
  plate: string;
  kmStart: number | null;
  kmEnd: number | null;
  status: "Finalizado" | "Em Andamento";
  startOdometerPhoto: string | null;
  endOdometerPhoto: string | null;
}

// This is now only used if localStorage is completely empty for the very first time.
const initialRecords: Record[] = [
  { id: 1, date: "2024-05-20", driver: "João Silva", car: "Fiat Argo", plate: "A123", kmStart: 12345, kmEnd: 12445, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 2, date: "2024-05-20", driver: "Maria Oliveira", car: "VW Gol", plate: "B456", kmStart: 54321, kmEnd: 54401, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 3, date: "2024-05-21", driver: "Carlos Pereira", car: "Hyundai HB20", plate: "C789", kmStart: 87654, kmEnd: null, status: "Em Andamento", startOdometerPhoto: null, endOdometerPhoto: null },
];

const getStoredRecords = (): Record[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('tripRecords');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    // Only set initial records if local storage is empty
    localStorage.setItem('tripRecords', JSON.stringify(initialRecords));
    return initialRecords;
};

const setStoredRecords = (records: Record[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('tripRecords', JSON.stringify(records));
        window.dispatchEvent(new Event('storage'));
    }
};

export default function RecordsPage() {
    const { toast } = useToast();
    const [records, setRecords] = useState<Record[]>([]);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isPhotosDialogOpen, setPhotosDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
    const [authPassword, setAuthPassword] = useState('');
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    
    const [newRecord, setNewRecord] = useState<Omit<Record, 'id' | 'status' | 'startOdometerPhoto' | 'endOdometerPhoto'>>({
        date: new Date().toISOString().split('T')[0],
        driver: '',
        car: '',
        plate: '',
        kmStart: null,
        kmEnd: null,
    });
    
    const [editRecordData, setEditRecordData] = useState<Record | null>(null);

    useEffect(() => {
        setRecords(getStoredRecords());

        const handleStorageChange = () => {
            setRecords(getStoredRecords());
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleAddRecord = () => {
      const newRecordWithId: Record = {
        ...newRecord,
        id: Date.now(),
        kmStart: newRecord.kmStart ? Number(newRecord.kmStart) : null,
        kmEnd: newRecord.kmEnd ? Number(newRecord.kmEnd) : null,
        status: newRecord.kmEnd ? "Finalizado" : "Em Andamento",
        startOdometerPhoto: null,
        endOdometerPhoto: null,
      };
      const updatedRecords = [...records, newRecordWithId];
      setRecords(updatedRecords);
      setStoredRecords(updatedRecords);
      setAddDialogOpen(false);
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        driver: '',
        car: '',
        plate: '',
        kmStart: null,
        kmEnd: null,
      });
    }
    
    const handleUpdateRecord = () => {
        if (!editRecordData) return;
        
        const updatedRecords = records.map(record => {
            if (record.id === editRecordData.id) {
                return {
                    ...editRecordData,
                    kmStart: editRecordData.kmStart ? Number(editRecordData.kmStart) : null,
                    kmEnd: editRecordData.kmEnd ? Number(editRecordData.kmEnd) : null,
                    status: editRecordData.kmEnd ? "Finalizado" : "Em Andamento" as "Finalizado" | "Em Andamento",
                };
            }
            return record;
        });
        setRecords(updatedRecords);
        setStoredRecords(updatedRecords);
        setEditDialogOpen(false);
        setEditRecordData(null);
        toast({ title: "Sucesso!", description: "Registro atualizado com sucesso." });
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

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Registros de Viagens</CardTitle>
                <CardDescription>Visualize e gerencie todos os registros de hodômetro.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline">
                    <FileUp className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Registro
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Registro</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da viagem manualmente. Esta opção não inclui upload de fotos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="driver">Motorista</Label>
                                    <Input id="driver" value={newRecord.driver} onChange={(e) => setNewRecord({...newRecord, driver: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plate">Chapa</Label>
                                    <Input id="plate" value={newRecord.plate} onChange={(e) => setNewRecord({...newRecord, plate: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="car">Veículo</Label>
                                    <Input id="car" value={newRecord.car} onChange={(e) => setNewRecord({...newRecord, car: e.target.value})} />
                                </div>
                               <div className="space-y-2">
                                    <Label htmlFor="date">Data</Label>
                                    <Input id="date" type="date" value={newRecord.date} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="kmStart">KM Início</Label>
                                    <Input id="kmStart" type="number" value={newRecord.kmStart ?? ''} onChange={(e) => setNewRecord({...newRecord, kmStart: e.target.valueAsNumber})} />
                                </div>
                               <div className="space-y-2">
                                    <Label htmlFor="kmEnd">KM Fim</Label>
                                    <Input id="kmEnd" type="number" value={newRecord.kmEnd ?? ''} onChange={(e) => setNewRecord({...newRecord, kmEnd: e.target.valueAsNumber})} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddRecord}>Salvar Registro</Button>
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
              <TableHead>Data</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Chapa</TableHead>
              <TableHead className="text-right">KM Início</TableHead>
              <TableHead className="text-right">KM Fim</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</TableCell>
                <TableCell className="font-medium">{record.driver}</TableCell>
                <TableCell>{record.car}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{record.plate}</Badge>
                </TableCell>
                <TableCell className="text-right">{record.kmStart ?? "—"}</TableCell>
                <TableCell className="text-right">{record.kmEnd ?? "—"}</TableCell>
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
                <DialogTitle className="flex items-center gap-2"><KeyRound /> Autorização Necessária</DialogTitle>
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
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Editar Registro</DialogTitle>
                <DialogDescription>
                    Modifique os detalhes da viagem. Apenas campos editáveis são mostrados.
                </DialogDescription>
            </DialogHeader>
            {editRecordData && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-driver">Motorista</Label>
                            <Input id="edit-driver" value={editRecordData.driver} onChange={(e) => setEditRecordData({...editRecordData, driver: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-plate">Chapa</Label>
                            <Input id="edit-plate" value={editRecordData.plate} onChange={(e) => setEditRecordData({...editRecordData, plate: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                            <Label htmlFor="edit-car">Veículo</Label>
                            <Input id="edit-car" value={editRecordData.car} onChange={(e) => setEditRecordData({...editRecordData, car: e.target.value})} />
                        </div>
                       <div className="space-y-2">
                            <Label htmlFor="edit-date">Data</Label>
                            <Input id="edit-date" type="date" value={editRecordData.date} onChange={(e) => setEditRecordData({...editRecordData, date: e.target.value})} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                            <Label htmlFor="edit-kmStart">KM Início</Label>
                            <Input id="edit-kmStart" type="number" value={editRecordData.kmStart ?? ''} onChange={(e) => setEditRecordData({...editRecordData, kmStart: e.target.value === '' ? null : Number(e.target.value)})} />
                        </div>
                       <div className="space-y-2">
                            <Label htmlFor="edit-kmEnd">KM Fim</Label>
                            <Input id="edit-kmEnd" type="number" value={editRecordData.kmEnd ?? ''} onChange={(e) => setEditRecordData({...editRecordData, kmEnd: e.target.value === '' ? null : Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdateRecord}>Salvar Alterações</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}
