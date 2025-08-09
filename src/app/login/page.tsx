
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth } from '@/lib/firebase'; // Import Firebase auth
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import auth function
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@topbus.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login bem-sucedido!",
        description: "Acesso de Gestor concedido. Redirecionando...",
      });
      router.push('/admin');
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/invalid-email':
              errorMessage = "O e-mail fornecido não foi encontrado.";
              break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
              errorMessage = "A senha está incorreta. Tente novamente.";
              break;
          default:
              errorMessage = "Não foi possível fazer login. Verifique suas credenciais.";
              break;
      }
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
            <h1 className="text-3xl font-bold text-white">FleetTrack Go</h1>
            <p className="text-muted-foreground">Gestão Inteligente de Frotas</p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Insira suas credenciais para entrar no painel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="admin@topbus.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha de Acesso</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Insira sua senha"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="link" className="w-full text-muted-foreground" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Módulos de Coleta
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
