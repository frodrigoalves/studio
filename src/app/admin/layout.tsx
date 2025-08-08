
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, FileText, LogOut, BrainCircuit, Loader2, Clock4, FileHeart, Wrench, Users, Fuel, ClipboardCheck, CircleDot, ShieldAlert, Clapperboard, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const pageTitles: { [key: string]: string } = {
    '/admin': 'Painel BI',
    '/admin/records': 'Registros de KM',
    '/admin/fueling': 'Registros de Abastecimento',
    '/admin/checklist': 'Registros de Vistoria',
    '/admin/vigia-digital': 'Vigia Digital - Análise de Danos',
    '/admin/settings': 'Configurações e Importação',
};


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pageTitle, setPageTitle] = useState('Painel de Gestão');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAdmin) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router]);
  
  useEffect(() => {
    setPageTitle(pageTitles[pathname] || 'Painel de Gestão');
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('isAdminAuthenticated');
    router.push('/login');
    toast({ title: 'Logout efetuado com sucesso.' });
  };
  
  const handleDevelopmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    toast({
        title: "Em Breve",
        description: "Esta funcionalidade está em desenvolvimento e será liberada em breve.",
    });
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="p-4 flex justify-center">
                 <Image src="/logo.jpeg" alt="TopBus Logo" width={140} height={35} className="group-data-[collapsible=icon]:hidden" />
                 <Image src="/logo.jpeg" alt="TopBus Logo" width={32} height={32} className="hidden group-data-[collapsible=icon]:block" />
            </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin">
                  <BrainCircuit />
                  Painel BI
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/vigia-digital">
                  <ShieldAlert />
                  Vigia Digital
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
           
            <SidebarSeparator />
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/records">
                  <FileText />
                  Registros KM
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/fueling">
                  <Fuel />
                  Registros Abastecimento
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/checklist">
                  <ClipboardCheck />
                  Vistoria
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarSeparator />

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#" onClick={handleDevelopmentClick}>
                  <Clock4 />
                  Viagens
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#" onClick={handleDevelopmentClick}>
                  <FileHeart />
                  Atestados
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#" onClick={handleDevelopmentClick}>
                  <Wrench />
                  Manutenção
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#" onClick={handleDevelopmentClick}>
                  <CircleDot />
                  Gestão de Pneu
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#" onClick={handleDevelopmentClick}>
                  <Users />
                  RH
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarSeparator />

            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                <Link href="/admin/settings">
                  <Settings />
                  Configurações
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{'G'}</AvatarFallback>
            </Avatar>
             <div className="group-data-[collapsible=icon]:hidden">
              <p className="font-semibold truncate capitalize">Gestor</p>
              <p className="text-xs text-muted-foreground truncate">admin@topbus.com</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col flex-1 h-screen">
        <header className="p-4 border-b flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold shrink-0">{pageTitle}</h1>
        </header>
        <main className="p-4 lg:p-6 flex-1 overflow-y-auto">{children}</main>
        <footer className="p-4 text-center text-xs text-muted-foreground border-t">
            <div>MVP Institucional desenvolvido por Rodrigo Alves para TopBus</div>
        </footer>
      </div>
    </SidebarProvider>
  );
}
