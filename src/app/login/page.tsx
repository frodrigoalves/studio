
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

const ADMIN_PASSWORD = "diretoria";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password === ADMIN_PASSWORD) {
        toast({
            title: "Login bem-sucedido!",
            description: "Acesso de Gestor concedido. Redirecionando...",
        });
        // Use a session storage item to simulate a logged-in state
        // This is a simple approach without full-blown auth.
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        router.push('/admin');
    } else {
        toast({
            variant: "destructive",
            title: "Senha Incorreta",
            description: "A senha de acesso está incorreta. Tente novamente.",
        });
        setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-6 text-center h-[50px]">
          <Image src="/logo.jpeg" alt="TopBus Logo" width={200} height={50} priority />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Painel de Gestão</CardTitle>
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
                  placeholder="Insira a senha de acesso"
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
                Voltar para a tela de preenchimento
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
