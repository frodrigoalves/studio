
'use client';

import { FuelingForm } from '@/components/fueling-form';
import { UserCog, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AbastecimentoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-background relative">
       <div className="absolute top-4 right-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/login">
            <UserCog className="h-6 w-6 text-muted-foreground hover:text-primary" />
            <span className="sr-only">Acesso do Gestor</span>
          </Link>
        </Button>
      </div>
       <div className="absolute top-4 left-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/">
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-primary" />
            <span className="sr-only">Voltar ao Menu</span>
          </Link>
        </Button>
      </div>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
           <h1 className="text-3xl font-bold text-white">Registro de Abastecimento</h1>
           <p className="text-muted-foreground mt-1">Preencha os dados do abastecimento.</p>
        </div>
        <FuelingForm />
      </div>
    </main>
  );
}
