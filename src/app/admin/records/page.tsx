
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, FileUp, Camera, AlertCircle } from "lucide-react";
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
  AlertDialogTrigger,
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

const initialRecords: Record[] = [
  { id: 1, date: "2024-05-20", driver: "João Silva", car: "Fiat Argo", plate: "A123", kmStart: 12345, kmEnd: 12445, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 2, date: "2024-05-20", driver: "Maria Oliveira", car: "VW Gol", plate: "B456", kmStart: 54321, kmEnd: 54401, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 3, date: "2024-05-21", driver: "Carlos Pereira", car: "Hyundai HB20", plate: "C789", kmStart: 87654, kmEnd: null, status: "Em Andamento", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 4, date: "2024-05-21", driver: "João Silva", car: "Fiat Argo", plate: "A123", kmStart: 12500, kmEnd: 12600, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 5, date: "2024-05-22", driver: "Ana Costa", car: "Chevrolet Onix", plate: "D101", kmStart: 34567, kmEnd: 34667, status: "Finalizado", startOdometerPhoto: null, endOdometerPhoto: null },
  { id: 6, date: "2024-05-23", driver: "Pedro Martins", car: "Ford Ka", plate: "E212", kmStart: 98765, kmEnd: null, status: "Em Andamento", startOdometerPhoto: null, endOdometerPhoto: null },
];

const getStoredRecords = (): Record[] => {
    if (typeof window === 'undefined') return initialRecords;
    const stored = localStorage.getItem('tripRecords');
    try {
        const parsed = stored ? JSON.parse(stored) : initialRecords;
        return Array.isArray(parsed) ? parsed : initialRecords;
    } catch {
        return initialRecords;
    }
};

const setStoredRecords = (records: Record[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('tripRecords', JSON.stringify(records));
        window.dispatchEvent(new Event('storage'));
    }
};

export default function RecordsPage() {
    const [records, setRecords] = useState<Record[]>([]);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isPhotosDialogOpen, setPhotosDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

    const [newRecord, setNewRecord] = useState<Omit<Record, 'id' | 'status' | 'startOdometerPhoto' | 'endOdometerPhoto'>>({
        date: new Date().toISOString().split('T')[0],
        driver: '',
        car: '',
        plate: '',
        kmStart: null,
        kmEnd: null,
    });

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

    const handleDeleteRecord = (id: number) => {
        const updatedRecords = records.filter(record => record.id !== id);
        setRecords(updatedRecords);
        setStoredRecords(updatedRecords);
    }

    const openPhotosDialog = (record: Record) => {
        setSelectedRecord(record);
        setPhotosDialogOpen(true);
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
                  <AlertDialog>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPhotosDialog(record)}>Ver Fotos</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">Excluir</DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                   <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. Isso excluirá permanentemente o registro de viagem.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteRecord(record.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
    </>
  );
}
