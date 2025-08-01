
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "./ui/button";
import Link from "next/link";


// Este componente foi depreciado e sua lógica foi movida para `driver-form.tsx`.
// Ele é mantido como um esqueleto para não quebrar a importação na página.
export function JourneyStartForm() {
  return (
    <Card className="shadow-2xl shadow-primary/10 border-2 border-primary/50">
        <CardHeader>
            <CardTitle>Funcionalidade Movida</CardTitle>
            <CardDescription>O início de jornada agora faz parte do Registro de KM.</CardDescription>
        </CardHeader>
      <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-muted-foreground mb-4">
                Para iniciar uma nova viagem, por favor, use o formulário de "Registro de KM".
            </p>
            <Button asChild>
                <Link href="/registro-km">Ir para Registro de KM</Link>
            </Button>
      </CardContent>
    </Card>
  );
}
