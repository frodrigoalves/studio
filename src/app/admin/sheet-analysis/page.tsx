
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sheet, Upload, Wand2 } from 'lucide-react';

type AnalysisType = 'hr' | 'maintenance';

export default function SheetAnalysisPage() {
  const { toast } = useToast();
  const [analysisType, setAnalysisType] = useState<AnalysisType>('hr');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== 'text/csv') {
        toast({
            variant: 'destructive',
            title: 'Formato Inválido',
            description: 'Por favor, envie apenas arquivos no formato CSV.'
        });
        setFile(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, faça o upload de uma planilha para análise.',
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      // Por enquanto, apenas exibimos uma mensagem de sucesso
      // A lógica da IA será implementada na próxima etapa
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // Lógica da IA virá aqui, usando `text`
        setAnalysisResult(`Análise para o arquivo "${file.name}" será exibida aqui. O tipo de análise selecionado foi: ${analysisType}. A IA irá processar as ${text.split('\n').length} linhas.`);
      };
      reader.readAsText(file);

    } catch (error) {
      console.error('Failed to analyze sheet', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description:
          'A IA não conseguiu processar a planilha. Verifique o arquivo e tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary rounded-full p-4 border-2 border-primary/20">
              <Sheet className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <CardTitle>Análise Inteligente de Planilhas</CardTitle>
              <CardDescription>
                Faça o upload de planilhas de RH ou Manutenção para que a IA
                identifique anomalias, tendências e insights.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-type">Tipo de Análise</Label>
              <Select
                value={analysisType}
                onValueChange={(value: AnalysisType) => setAnalysisType(value)}
                disabled={isLoading}
              >
                <SelectTrigger id="analysis-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">Recursos Humanos (Atestados)</SelectItem>
                  <SelectItem value="maintenance">Manutenção de Veículos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-upload">Planilha (somente .csv)</Label>
               <div className="relative">
                 <Input
                    id="sheet-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="pr-12"
                 />
                 <Upload className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <Button
            onClick={handleGenerateAnalysis}
            disabled={isLoading || !file}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Analisando...' : 'Gerar Análise com IA'}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Análise</CardTitle>
            <CardDescription>
              Abaixo estão os insights gerados pela IA com base no arquivo enviado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={analysisResult} className="h-48 bg-muted/50" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
