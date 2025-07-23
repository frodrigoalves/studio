
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login logic - in a real app, you'd validate credentials
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (email === 'admin@fleet.com' && password === 'admin') {
       toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel do gestor.",
        variant: "default",
        className: "bg-accent text-accent-foreground",
      });
      router.push('/admin');
    } else {
       toast({
        variant: "destructive",
        title: "Credenciais inválidas",
        description: "Por favor, verifique seu email e senha.",
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="bg-primary/10 text-primary rounded-full p-4 mb-4 border-2 border-primary/20">
            <Bus className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">TopBus</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Acesso ao Painel do Gestor
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
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="gestor@email.com" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
