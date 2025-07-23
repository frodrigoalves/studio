import { DriverForm } from '@/components/driver-form';
import { Bus } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="bg-primary/10 text-primary rounded-full p-4 mb-4 border-2 border-primary/20">
                <Bus className="w-10 h-10" />
            </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">TopBus</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Registre o início e o fim das suas viagens de forma rápida e fácil.
          </p>
        </div>
        <DriverForm />
      </div>
    </main>
  );
}
