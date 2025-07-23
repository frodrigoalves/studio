
import { DriverForm } from '@/components/driver-form';
import { UserCog, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

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
            Controle de viagens rápido e fácil.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="mt-2">
                <HelpCircle className="mr-2 h-4 w-4" />
                Como preencher?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tutorial de Preenchimento</DialogTitle>
                <DialogDescription>Siga os passos abaixo para registrar sua viagem corretamente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-sm">
                <div className="space-y-1">
                  <h4 className="font-semibold">1. Iniciar Viagem:</h4>
                  <p className="text-muted-foreground">
                    Na aba "Iniciar Viagem", preencha sua chapa. Seu nome e carro serão preenchidos automaticamente. Informe o KM inicial e tire uma foto do odômetro.
                  </p>
                </div>
                 <div className="space-y-1">
                  <h4 className="font-semibold">2. Finalizar Viagem:</h4>
                  <p className="text-muted-foreground">
                   Ao retornar, vá para a aba "Finalizar Viagem". Sua chapa, nome e carro já devem estar lá. Informe o KM final e tire uma nova foto do odômetro.
                  </p>
                </div>
                 <div className="space-y-1">
                  <h4 className="font-semibold">Pronto!</h4>
                  <p className="text-muted-foreground">
                   Seu registro será enviado e você pode iniciar uma nova viagem.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <DriverForm />
      </div>
    </main>
  );
}
