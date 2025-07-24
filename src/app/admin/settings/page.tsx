
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDieselPrices, saveDieselPrice, type DieselPrice } from "@/services/settings";

export default function SettingsPage() {
    const { toast } = useToast();
    const [prices, setPrices] = useState<DieselPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchPrices = async () => {
        setIsLoading(true);
        try {
            const fetchedPrices = await getDieselPrices();
            setPrices(fetchedPrices);
        } catch (error) {
            console.error("Failed to fetch diesel prices", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar o histórico de preços.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    const handleSavePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceValue = parseFloat(newPrice);

        if (!newPrice || !newDate || isNaN(priceValue) || priceValue <= 0) {
            toast({
                variant: 'destructive',
                title: "Dados Inválidos",
                description: "Por favor, preencha o preço e a data corretamente."
            });
            return;
        }
        
        setIsSaving(true);
        try {
            await saveDieselPrice({
                date: newDate,
                price: priceValue.toFixed(2),
            });
            
            setNewPrice('');
            setNewDate(new Date().toISOString().split('T')[0]);
            fetchPrices(); // Refresh data

            toast({
                title: "Sucesso!",
                description: "O novo preço do diesel foi salvo."
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Erro ao Salvar",
                description: "Não foi possível salvar o novo preço. Tente novamente."
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Valor do Diesel</CardTitle>
                    <CardDescription>Adicione ou atualize o valor do litro do diesel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSavePrice}>
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço por Litro (R$)</Label>
                            <Input 
                                id="price" 
                                type="number" 
                                step="0.01" 
                                placeholder="5.50" 
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Data de Vigência</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isSaving ? "Salvando..." : "Salvar Preço"}
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
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : prices.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</TableCell>
                                    <TableCell className="text-right font-mono">{Number(item.price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
