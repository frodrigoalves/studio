
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

const ADMIN_PASSWORD = "topbus2025";
const AUTH_KEY = 'topbus_admin_auth';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(AUTH_KEY, 'true');
        toast({
          title: "Acesso autorizado!",
          description: "Bem-vindo ao Painel de Gestão.",
        });
        router.push('/admin');
      } catch (error) {
         toast({
            variant: "destructive",
            title: "Erro de Sessão",
            description: "Não foi possível iniciar a sessão. Verifique as permissões do seu navegador.",
        });
         setIsLoading(false);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Senha Incorreta",
        description: "A senha de acesso está incorreta. Tente novamente.",
      });
      setPassword('');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="relative w-48 h-14 mb-4">
              <Image src="/logo.jpeg" alt="TopBus Logo" fill priority className="object-contain" sizes="(max-width: 768px) 100vw, 50vw"/>
            </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Insira a senha de acesso para entrar no painel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
