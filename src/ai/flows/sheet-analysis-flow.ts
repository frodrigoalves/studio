
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
  analysisType: z.string().describe('O tipo de análise a ser realizada. Ex: "Análise de Atestados Médicos", "Análise de Manutenção de Frota".'),
});
export type SheetAnalysisInput = z.infer<typeof SheetAnalysisInputSchema>;


const SheetAnalysisOutputSchema = z.object({
  title: z.string().describe("Um título geral para a análise gerada, baseado no tipo de análise solicitado."),
  summary: z.string().describe('Um resumo executivo dos principais pontos encontrados no documento.'),
  keyFindings: z.array(z.object({
    finding: z.string().describe('A descrição do ponto de atenção ou anomalia identificada.'),
    details: z.string().describe('Detalhes adicionais, métricas ou dados que suportam a descoberta.'),
    implication: z.string().describe('A implicação ou o impacto de negócio que essa descoberta tem.'),
  })).describe('Uma lista de anomalias, tendências ou pontos de atenção importantes.'),
  recommendations: z.array(z.string()).describe('Uma lista de ações práticas recomendadas com base nas descobertas.'),
});
export type SheetAnalysisOutput = z.infer<typeof SheetAnalysisOutputSchema>;


const analysisPrompt = ai.definePrompt({
    name: 'analysisPrompt',
    input: { schema: SheetAnalysisInputSchema },
    output: { schema: SheetAnalysisOutputSchema },
    prompt: `
      Você é um analista de dados especialista para Guilherme da TopBus Transportes.
      Sua tarefa é realizar uma **{{analysisType}}** com base no documento fornecido.

      **Instruções Cruciais:**
      1.  **Foco nos Dados:** Ignore completamente cabeçalhos, rodapés, menus ou qualquer outro elemento de interface da planilha (como "Arquivo", "Página Inicial", "Inserir", etc.). Concentre-se APENAS na tabela de dados, ou seja, nas linhas e colunas que contêm as informações relevantes.
      2.  **Identifique os Cabeçalhos da Tabela:** A primeira linha com texto geralmente contém os nomes das colunas. Use-os para entender o significado de cada coluna de dados.
      3.  **Seja um Especialista no Assunto:** Aja como um especialista no tópico de **"{{analysisType}}"**. Sua análise deve refletir o conhecimento desse domínio.
          *   Se for **Atestados Médicos**, foque em padrões de ausência, CIDs recorrentes, e anomalias entre equipes ou indivíduos.
          *   Se for **Manutenção**, foque em veículos críticos, defeitos recorrentes, e gargalos de tempo de reparo.
          *   Se for **Viagens**, foque em atrasos, cancelamentos e performance de rotas.
          *   Se for **RH**, foque em métricas gerais de RH, como turnover, absenteísmo, ou outros dados fornecidos.
      4.  **Estrutura do Relatório:** Gere um relatório claro e acionável.
          *   **title:** Use o '{{analysisType}}' como título principal.
          *   **summary:** Um parágrafo executivo com os insights mais importantes.
          *   **keyFindings:** Uma lista detalhada das 3 a 5 descobertas mais críticas. Para cada uma, explique o achado, os dados que o suportam e qual o impacto para o negócio.
          *   **recommendations:** Com base nos achados, sugira de 2 a 3 ações ou investigações práticas para o Guilherme.

      O relatório deve ser objetivo e formatado para ser facilmente copiado para uma apresentação.

      **Dados do Documento:**
      {{media url=fileDataUri}}

      Agora, gere a análise no formato de saída JSON especificado, atuando como um especialista em **{{analysisType}}**.
    `,
});


const sheetAnalysisFlow = ai.defineFlow(
  {
    name: 'sheetAnalysisFlow',
    inputSchema: SheetAnalysisInputSchema,
    outputSchema: SheetAnalysisOutputSchema,
    description: 'Analyzes spreadsheet data and provides a structured report with findings and recommendations.',
  },
  async (input) => {
    const { output } = await analysisPrompt(input);
    return output!;
  }
);

export const analyseSheet = sheetAnalysisFlow;
