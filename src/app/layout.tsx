
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const metadata: Metadata = {
  title: 'TopBus | Gestão Inteligente de Frotas e Análise de Dados',
  description: 'Otimize a gestão da sua frota com a TopBus. Registre viagens, controle o hodômetro, analise o consumo de combustível e gere relatórios inteligentes com nossa plataforma de análise de dados para transportes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans antialiased">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <Toaster />
      </body>
    </html>
  );
}
