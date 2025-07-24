
'use server';
/**
 * @fileOverview Agente de IA para análise de planilhas.
 *
 * - analyseSheet: Processa o conteúdo de uma planilha e retorna uma análise.
 * - SheetAnalysisInput: O tipo de entrada para a função analyseSheet.
 * - SheetAnalysisOutput: O tipo de retorno para a função analyseSheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SheetAnalysisInputSchema = z.object({
  fileDataUri: z.string().describe("O conteúdo do arquivo como uma URI de dados (pode ser CSV, imagem, PDF, etc.)."),
  analysisType: z.enum(['hr', 'maintenance']).describe('O tipo de análise a ser realizada: "hr" para Recursos Humanos ou "maintenance" para Manutenção.'),
});
export type SheetAnalysisInput = z.infer<typeof SheetAnalysisInputSchema>;


const SheetAnalysisOutputSchema = z.object({
  title: z.string().describe("Um título geral para a análise gerada."),
  summary: z.string().describe('Um resumo executivo dos principais pontos encontrados na planilha.'),
  keyFindings: z.array(z.object({
    finding: z.string().describe('A descrição do ponto de atenção ou anomalia identificada.'),
    details: z.string().describe('Detalhes adicionais, métricas ou dados que suportam a descoberta.'),
    implication: z.string().describe('A implicação ou o impacto de negócio que essa descoberta tem.'),
  })).describe('Uma lista de anomalias, tendências ou pontos de atenção importantes.'),
  recommendations: z.array(z.string()).describe('Uma lista de ações práticas recomendadas com base nas descobertas.'),
});
export type SheetAnalysisOutput = z.infer<typeof SheetAnalysisOutputSchema>;


const hrAnalysisPrompt = ai.definePrompt({
    name: 'hrAnalysisPrompt',
    input: { schema: SheetAnalysisInputSchema },
    output: { schema: SheetAnalysisOutputSchema },
    prompt: `
      Você é um especialista em Recursos Humanos e analista de dados para o Guilherme da TopBus Transportes.
      Seu objetivo é analisar o documento de atestados médicos para encontrar padrões, anomalias e insights para a reunião semanal da diretoria.
      Primeiro, verifique o tipo de arquivo. Se for uma imagem ou PDF, use OCR para extrair todo o texto antes de prosseguir com a análise.
      Foque nos dados concretos, ignorando cabeçalhos e rodapés complexos. Identifique a linha de cabeçalho para entender as colunas.

      Foco da Análise:
      1.  **Identificar Colaboradores Ausentes:** Liste os 5 colaboradores com maior número de atestados ou dias de ausência.
      2.  **Principais Causas (CID):** Identifique os 3 CIDs (doenças) mais frequentes no documento.
      3.  **Anomalias:** Procure por padrões incomuns. Ex: Um grupo de motoristas da mesma rota apresentando o mesmo CID; um aumento súbito de atestados em um determinado período; atestados frequentes de curta duração para o mesmo colaborador.
      4.  **Recomendações:** Com base na análise, sugira 2-3 ações para a diretoria. Ex: "Iniciar campanha de vacinação contra gripe (CID J11)", "Investigar condições de ergonomia na rota X", "Oferecer suporte de saúde mental para o colaborador Y".

      O relatório deve ser claro, objetivo e formatado para ser facilmente copiado para uma apresentação.

      **Dados do Documento:**
      {{media url=fileDataUri}}

      Agora, gere a análise no formato de saída JSON especificado.
    `,
});

const maintenanceAnalysisPrompt = ai.definePrompt({
    name: 'maintenanceAnalysisPrompt',
    input: { schema: SheetAnalysisInputSchema },
    output: { schema: SheetAnalysisOutputSchema },
    prompt: `
      Você é um especialista em gestão de frotas e analista de dados para o Guilherme da TopBus Transportes.
      Seu objetivo é analisar o documento de manutenção de veículos para encontrar gargalos, otimizar custos e aumentar a disponibilidade da frota para a reunião semanal da diretoria.
      Primeiro, verifique o tipo de arquivo. Se for uma imagem ou PDF, use OCR para extrair todo o texto antes de prosseguir com a análise.
      Foque em dados concretos, ignorando cabeçalhos e rodapés complexos. Identifique a linha de cabeçalho para entender as colunas.

      Foco da Análise:
      1.  **Veículos Críticos:** Liste os 5 veículos com maior tempo total em manutenção ou maior frequência de reparos.
      2.  **Principais Defeitos:** Identifique os 3 tipos de reparo mais comuns em toda a frota.
      3.  **Anomalias e Gargalos:** Procure por padrões. Ex: Um tipo de peça que falha recorrentemente em um modelo específico de ônibus; tempo de reparo para o mesmo defeito muito discrepante entre equipes; correlação entre motoristas e tipos específicos de avaria (se possível cruzar dados).
      4.  **Recomendações:** Com base na análise, sugira 2-3 ações para a diretoria. Ex: "Considerar a troca do fornecedor da peça X", "Padronizar o processo de reparo para o defeito Y para reduzir o tempo de parada", "Promover treinamento de direção defensiva para os motoristas que mais geram manutenção corretiva".

      O relatório deve ser claro, objetivo e formatado para ser facilmente copiado para uma apresentação.

      **Dados do Documento:**
      {{media url=fileDataUri}}

      Agora, gere a análise no formato de saída JSON especificado.
    `,
});


export async function analyseSheet(input: SheetAnalysisInput): Promise<SheetAnalysisOutput> {
  return sheetAnalysisFlow(input);
}


const sheetAnalysisFlow = ai.defineFlow(
  {
    name: 'sheetAnalysisFlow',
    inputSchema: SheetAnalysisInputSchema,
    outputSchema: SheetAnalysisOutputSchema,
  },
  async (input) => {
    const analysisWithTitle = {
        ...input,
        title: input.analysisType === 'hr' ? 'Análise de Atestados Médicos (RH)' : 'Análise de Manutenção de Frota',
    };

    if (input.analysisType === 'hr') {
        const { output } = await hrAnalysisPrompt(analysisWithTitle);
        return output!;
    } else {
        const { output } = await maintenanceAnalysisPrompt(analysisWithTitle);
        return output!;
    }
  }
);
