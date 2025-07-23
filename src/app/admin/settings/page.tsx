import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";

const dieselPrices = [
    { id: 1, date: "2024-05-01", price: "5.50" },
    { id: 2, date: "2024-04-15", price: "5.45" },
    { id: 3, date: "2024-04-01", price: "5.42" },
]

export default function SettingsPage() {
    return (
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Valor do Diesel</CardTitle>
                    <CardDescription>Adicione ou atualize o valor do litro do diesel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço por Litro (R$)</Label>
                            <Input id="price" type="number" step="0.01" placeholder="5.50" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Data de Vigência</Label>
                            <Input id="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <Button className="w-full">
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Preço
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Preços</CardTitle>
                    <CardDescription>Valores do diesel registrados anteriormente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Preço (R$)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dieselPrices.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</TableCell>
                                    <TableCell className="text-right font-mono">{item.price}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
