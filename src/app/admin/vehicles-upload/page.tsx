'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle, AlertTriangle, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type DiffResp = {
  added: any[];
  removed: any[];
  changed: Array<{ id: string; before: any; after: any }>;
  totals: { cur: number; next: number };
};

export default function VehiclesUploadPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [diff, setDiff] = React.useState<DiffResp | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setDiff(null);
    setErrorMsg(null);
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  async function handleValidate() {
    if (!file) return;
    setIsBusy(true);
    setErrorMsg(null);
    setDiff(null);

    const fd = new FormData();
    fd.append('file', file);
    
    try {
      const res = await fetch('/api/vehicle-catalog/validate', { method: 'POST', body: fd });
      const js = await res.json();
      
      if (!res.ok) {
        throw new Error(js.error || 'Falha ao validar o arquivo.');
      }
      setDiff(js);
      toast({ title: 'Validação Concluída', description: 'O preview das alterações está pronto.' });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    if (!confirm('Você tem certeza que deseja publicar esta atualização do catálogo? Esta ação irá modificar os dados no banco de dados.')) return;
    
    setIsBusy(true);
    setErrorMsg(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/vehicle-catalog/commit', { method: 'POST', body: fd });
      const js = await res.json();
      
      if (!res.ok) {
        throw new Error(js.error || 'Falha ao publicar as alterações.');
      }
      
      toast({
        title: 'Catálogo Atualizado!',
        description: `Adicionados: ${js.summary.added}, Alterados: ${js.summary.changed}, Inativados: ${js.summary.inactivated}.`
      });
      resetState();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload do Catálogo de Veículos</CardTitle>
          <CardDescription>
            Faça o upload de uma planilha (.xlsx, .csv) para adicionar ou atualizar os parâmetros dos veículos no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input id="file-upload" type="file" accept=".xlsx,.csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isBusy} />
            <p className="text-xs text-muted-foreground">O arquivo deve conter as colunas: VEICULO, TIPO CHASSI, AMARELA, VERDE, DOURADA, CAPACIDADE TANQUE.</p>
          </div>
          <div className="flex gap-2">
            <Button disabled={!file || isBusy} onClick={handleValidate}>
              {isBusy && diff === null ? <Loader2 className="animate-spin" /> : <CheckCircle />}
              Validar Arquivo
            </Button>
            <Button disabled={!diff || isBusy} onClick={handleCommit}>
              {isBusy && diff !== null ? <Loader2 className="animate-spin" /> : <Upload />}
              Publicar Alterações
            </Button>
          </div>
           {errorMsg && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
           )}
        </CardContent>
      </Card>
      
      {diff && (
        <Card>
            <CardHeader>
                <CardTitle>Preview das Alterações</CardTitle>
                <CardDescription>
                    Veículos no sistema: {diff.totals.cur} → <b>{diff.totals.next}</b> (Após publicação).
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-green-700 dark:text-green-400"><PlusCircle/> Adicionados ({diff.added.length})</h3>
                      <ul className="list-disc ml-5 mt-2 text-sm text-green-800 dark:text-green-300">
                        {diff.added.slice(0,10).map((v:any) => <li key={v.carId}>{v.carId} — <Badge variant="secondary">{v.chassisType}</Badge></li>)}
                        {diff.added.length > 10 && <li>e mais {diff.added.length - 10}...</li>}
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400"><ArrowRight/> Alterados ({diff.changed.length})</h3>
                       <ul className="list-disc ml-5 mt-2 text-sm text-amber-800 dark:text-amber-300">
                        {diff.changed.slice(0,10).map((c:any) => <li key={c.id}>{c.id}: <Badge variant="outline">{c.before._hash.substring(0,6)}</Badge> → <Badge>{c.after._hash.substring(0,6)}</Badge></li>)}
                        {diff.changed.length > 10 && <li>e mais {diff.changed.length - 10}...</li>}
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-red-700 dark:text-red-400"><Trash2/> Removidos ({diff.removed.length})</h3>
                       <ul className="list-disc ml-5 mt-2 text-sm text-red-800 dark:text-red-300">
                        {diff.removed.slice(0,10).map((v:any) => <li key={v.carId}>{v.carId}</li>)}
                        {diff.removed.length > 10 && <li>e mais {diff.removed.length - 10}...</li>}
                      </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
