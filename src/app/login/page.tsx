
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login logic
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (name.toLowerCase() === 'admin' && uniqueNumber === '12345') {
       toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel do gestor.",
        className: "bg-green-100 text-green-800",
      });
      router.push('/admin');
    } else {
       toast({
        variant: "destructive",
        title: "Credenciais inválidas",
        description: "Por favor, verifique seu nome e número único.",
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="bg-primary/10 text-primary rounded-full p-4 mb-4 border-2 border-primary/20">
            <Bus className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">TopBus</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Acesso ao Painel de Gestor
          </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Insira suas credenciais para acessar o painel.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input 
                            id="name" 
                            type="text" 
                            placeholder="Seu nome" 
                            required 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unique-number">Número Único</Label>
                        <Input 
                            id="unique-number" 
                            type="password" 
                            required 
                            placeholder="Seu número único"
                            value={uniqueNumber}
                            onChange={(e) => setUniqueNumber(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                    </Button>
                </form>
                 <Button variant="link" className="w-full mt-4 text-muted-foreground" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a tela de preenchimento
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
