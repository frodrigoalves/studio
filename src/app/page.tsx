import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserCog, Fuel, ClipboardCheck, FileText, CircleDot } from 'lucide-react';
import Image from 'next/image';

const menuOptions = [
  { href: '/registro-km', label: 'REGISTRO DE KM', icon: FileText, available: true },
  { href: '/abastecimento', label: 'ABASTECIMENTO', icon: Fuel, available: true },
  { href: '/vistoria', label: 'VISTORIA', icon: ClipboardCheck, available: true },
  { href: '/gestao-pneu', label: 'GESTÃO DE PNEU', icon: CircleDot, available: false },
];

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
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <Image src="/logo.jpeg" alt="TopBus Logo" width={200} height={50} priority />
      </div>
      <div className="w-full max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {menuOptions.map((item) => {
            const cardContent = (
              <Card className="aspect-square flex items-center justify-center p-4 hover:bg-accent hover:border-primary transition-colors duration-200">
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
              <div key={item.label} className="cursor-not-allowed opacity-50">
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
