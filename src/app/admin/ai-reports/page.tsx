import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function AiReportsPage() {
  return (
    <div className="flex items-center justify-center h-full">
        <Card className="max-w-2xl w-full text-center shadow-lg">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 mb-4 border-2 border-primary/20 w-fit">
                    <Sparkles className="w-10 h-10" />
                </div>
                <CardTitle>Relatórios com Inteligência Artificial</CardTitle>
                <CardDescription>Funcionalidade em desenvolvimento.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Em breve, esta seção usará IA para gerar resumos automáticos para suas reuniões semanais. Analisaremos os dados de quilometragem, custos e desempenho para fornecer insights valiosos, identificar pontos de melhoria e sugerir otimizações.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
