
'use client';

import { JourneyStartForm } from '@/components/journey-start-form';
import { UserCog, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function InicioJornadaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-background relative">
       <div className="absolute top-4 right-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/login">
            <UserCog className="h-6 w-6" />
            <span className="sr-only">Acesso do Gestor</span>
          </Link>
        </Button>
      </div>
       <div className="absolute top-4 left-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Voltar ao Menu</span>
          </Link>
        </Button>
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <Image src="/logo.jpeg" alt="TopBus Logo" width={200} height={50} priority />
           <h1 className="text-xl font-semibold mt-4">Vistoria e registro de km</h1>
        </div>
        {/* O conteúdo complexo foi movido para o DriverForm. Esta página pode ser removida/alterada. */}
        <p className="text-center text-muted-foreground">Esta funcionalidade foi integrada ao Registro de KM.</p>
        <div className="mt-4 flex justify-center">
            <Button asChild>
                <Link href="/registro-km">Ir para Registro de KM</Link>
            </Button>
        </div>
      </div>
    </main>
  );
}
