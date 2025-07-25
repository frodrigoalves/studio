
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, FileText, LogOut, BrainCircuit, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";


interface User {
  name: string;
  role: 'diretor' | 'analyst';
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    localStorage.removeItem('user');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simula logout
    router.push('/login');
    setIsLoggingOut(false);
  };
  
  if (loading || !user) {
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
          <div className="flex items-center gap-3 p-2">
            <Logo className="w-auto h-10" />
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="font-semibold text-lg">Painel Gestor</h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin">
                  <BrainCircuit />
                  Business Intelligence
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/records">
                  <FileText />
                  Registros
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
             <div className="group-data-[collapsible=icon]:hidden">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role === 'diretor' ? 'Diretoria' : 'Analista'}</p>
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
            <h1 className="text-xl font-semibold">Painel de Gestão</h1>
        </header>
        <main className="p-4 lg:p-6 flex-1 overflow-y-auto">{children}</main>
        <footer className="p-4 text-center text-xs text-muted-foreground border-t">
            <div>Institutional MVP developed by Rodrigo Alves</div>
        </footer>
      </div>
    </SidebarProvider>
  );
}
