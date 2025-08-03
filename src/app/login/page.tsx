
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';


const getFirebaseErrorMessage = (error: FirebaseError) => {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'O formato do e-mail é inválido.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
             return 'E-mail ou senha incorretos.';
        case 'auth/email-already-in-use':
            return 'Este e-mail já está em uso por outra conta.';
        case 'auth/weak-password':
            return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
        case 'auth/operation-not-allowed':
             return 'Login com e-mail e senha não está habilitado.';
        default:
            return 'Ocorreu um erro inesperado. Tente novamente.';
    }
}


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (activeTab === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
            toast({
                title: "Login bem-sucedido!",
                description: "Redirecionando para o painel do gestor.",
                className: "bg-green-100 text-green-800",
            });
            router.push('/admin');
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            toast({
                title: "Cadastro realizado com sucesso!",
                description: "Você já pode fazer o login. Redirecionando...",
                className: "bg-green-100 text-green-800",
            });
            setActiveTab('login'); // Switch to login tab after successful registration
        }
    } catch (error) {
        const firebaseError = error as FirebaseError;
        console.error("Firebase Authentication Error:", firebaseError);
        toast({
            variant: "destructive",
            title: "Erro na autenticação",
            description: getFirebaseErrorMessage(firebaseError),
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-6 text-center h-[50px]">
          <Image src="/logo.jpeg" alt="TopBus Logo" width={200} height={50} priority />
          <p className="mt-2 text-lg text-muted-foreground">
            Acesso ao Painel de Gestor
          </p>
        </div>
        <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                     <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>Insira seu e-mail e senha para acessar o painel.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="login-email">E-mail</Label>
                                <Input id="login-email" type="email" placeholder="gestor@topbus.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-password">Senha</Label>
                                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Autenticando...' : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>
                </TabsContent>
                <TabsContent value="register">
                     <CardHeader>
                        <CardTitle>Cadastro</CardTitle>
                        <CardDescription>Crie uma nova conta para acessar o painel de gestão.</CardDescription>
                    </CardHeader>
                     <CardContent>
                         <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="register-email">E-mail</Label>
                                <Input id="register-email" type="email" placeholder="novo.gestor@topbus.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-password">Senha</Label>
                                <Input id="register-password" type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Criando conta...' : 'Cadastrar'}
                            </Button>
                        </form>
                    </CardContent>
                </TabsContent>
            </Tabs>
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

