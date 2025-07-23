import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, FileUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const records = [
  { id: 1, date: "2024-05-20", driver: "João Silva", car: "Fiat Argo", plate: "ABC-1234", kmStart: 12345, kmEnd: 12445, status: "Finalizado" },
  { id: 2, date: "2024-05-20", driver: "Maria Oliveira", car: "VW Gol", plate: "DEF-5678", kmStart: 54321, kmEnd: 54401, status: "Finalizado" },
  { id: 3, date: "2024-05-21", driver: "Carlos Pereira", car: "Hyundai HB20", plate: "GHI-9012", kmStart: 87654, kmEnd: null, status: "Em Andamento" },
  { id: 4, date: "2024-05-21", driver: "João Silva", car: "Fiat Argo", plate: "ABC-1234", kmStart: 12500, kmEnd: 12600, status: "Finalizado" },
  { id: 5, date: "2024-05-22", driver: "Ana Costa", car: "Chevrolet Onix", plate: "JKL-3456", kmStart: 34567, kmEnd: 34667, status: "Finalizado" },
  { id: 6, date: "2024-05-23", driver: "Pedro Martins", car: "Ford Ka", plate: "MNO-7890", kmStart: 98765, kmEnd: null, status: "Em Andamento" },
];

export default function RecordsPage() {
  return (
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
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Registro
                </Button>
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
              <TableHead>Matrícula</TableHead>
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
                <TableCell className="text-right">{record.kmStart}</TableCell>
                <TableCell className="text-right">{record.kmEnd ?? "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={record.status === "Finalizado" ? "default" : "outline"} className={record.status === "Finalizado" ? "bg-accent/80 text-accent-foreground" : ""}>
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
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Ver Fotos</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
