
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DieselPrice {
    id: number;
    date: string;
    price: string;
}

const getStoredPrices = (): DieselPrice[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('dieselPrices');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const setStoredPrices = (prices: DieselPrice[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('dieselPrices', JSON.stringify(prices));
    }
};

export default function SettingsPage() {
    const { toast } = useToast();
    const [prices, setPrices] = useState<DieselPrice[]>([]);
    const [newPrice, setNewPrice] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setPrices(getStoredPrices());
    }, []);

    const handleSavePrice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPrice || !newDate) {
            toast({
                variant: 'destructive',
                title: "Erro",
                description: "Por favor, preencha o preço e a data."
            });
            return;
        }

        const newPriceEntry: DieselPrice = {
            id: Date.now(),
            date: newDate,
            price: parseFloat(newPrice).toFixed(2),
        };

        const updatedPrices = [...prices, newPriceEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPrices(updatedPrices);
        setStoredPrices(updatedPrices);

        setNewPrice('');
        setNewDate(new Date().toISOString().split('T')[0]);

        toast({
            title: "Sucesso!",
            description: "O novo preço do diesel foi salvo."
        });
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
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Data de Vigência</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full">
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
                            {prices.map(item => (
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
