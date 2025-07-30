
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    let userRole: 'diretor' | 'analyst' | null = null;
    let loginSuccess = false;

    if (password === 'diretoria') {
        userRole = 'diretor';
        loginSuccess = true;
    } else if (password === 'analise2024') {
        userRole = 'analyst';
        loginSuccess = true;
    }

    if (loginSuccess && userRole) {
      localStorage.setItem('user', JSON.stringify({ name: name || (userRole === 'diretor' ? 'Diretor' : 'Analista'), role: userRole }));
      
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel do gestor.",
        className: "bg-green-100 text-green-800",
      });
      router.push('/admin');
    } else {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Nome de usuário ou senha incorretos.",
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <Image src="/logo.jpg" alt="TopBus Logo" width={200} height={50} priority />
          <p className="mt-2 text-lg text-muted-foreground">
            Acesso ao Painel de Gestor
          </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Insira seu nome e a senha de acesso.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Autenticando...' : 'Entrar'}
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
