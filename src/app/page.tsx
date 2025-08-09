
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserCog, Fuel, ClipboardCheck, FileText, CircleDot } from 'lucide-react';

const menuOptions = [
  { href: '/registro-km', label: 'REGISTRO DE KM', icon: FileText, available: true, highlight: true },
  { href: '/vistoria', label: 'VISTORIA', icon: ClipboardCheck, available: true },
  { href: '/abastecimento', label: 'ABASTECIMENTO', icon: Fuel, available: true },
  { href: '/pneu', label: 'GESTÃO DE PNEU', icon: CircleDot, available: true },
];

export default function Home() {
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
      <div className="flex flex-col items-center justify-center mb-8 text-center">
        <Image src="/logo.jpeg" alt="TopBus Logo" width={250} height={70} priority />
        <p className="text-lg text-muted-foreground mt-2">Módulos de Coleta Operacional</p>
      </div>
      <div className="w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {menuOptions.map((item) => {
            const cardClasses = `aspect-square flex items-center justify-center p-4 bg-card/50 hover:bg-accent hover:border-primary transition-colors duration-200 backdrop-blur-sm border-2 border-transparent ${item.highlight ? 'border-primary shadow-lg shadow-primary/20' : ''}`;

            const cardContent = (
              <Card className={cardClasses}>
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2 text-center">
                  <item.icon className="h-10 w-10 text-primary" />
                  <span className="font-semibold text-sm">{item.label}</span>
                   {!item.available && (
                     <span className="text-xs text-muted-foreground">(Em breve)</span>
                   )}
                </CardContent>
              </Card>
            );

            if (item.available) {
              return (
                <Link href={item.href} key={item.label}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={item.label} className={`cursor-not-allowed opacity-50`}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
