
import { DriverForm } from '@/components/driver-form';
import { UserCog } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
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
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Topbus Transportes</h1>
          <p className="mt-2 text-md text-muted-foreground">
            Registre o início e o fim das suas viagens de forma rápida e fácil.
          </p>
        </div>
        <DriverForm />
      </div>
    </main>
  );
}
