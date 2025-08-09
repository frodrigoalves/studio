
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Quicksand } from 'next/font/google';

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' });

const metadata: Metadata = {
  title: 'TopBus | Gestão Inteligente de Frotas e Análise de Dados',
  description: 'Otimize a gestão da sua frota com a TopBus. Registre viagens, controle o hodômetro, analise o consumo de combustível e gere relatórios inteligentes com nossa plataforma de análise de dados para transportes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" className={quicksand.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans antialiased">
            {children}
        <Toaster />
      </body>
    </html>
  );
}
