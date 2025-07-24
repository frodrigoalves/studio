
'use server';
/**
 * @fileOverview Um agente de IA para análise de relatórios de frota.
 *
 * - generateReport: Gera um relatório com base nos registros de viagem e preços de diesel.
 * - ReportInput: O tipo de entrada para a função generateReport.
 * - ReportOutput: O tipo de retorno para a função generateReport.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Record } from '@/services/records';
import { DieselPrice } from '@/services/settings';

const ReportInputSchema = z.object({
  records: z.array(z.any()).describe("Uma lista de objetos de registro de viagem."),
  dieselPrices: z.array(z.any()).describe("Uma lista de objetos de preço do diesel."),
  period: z.enum(["daily", "weekly", "monthly"]).describe("O período para a análise do relatório: diário, semanal ou mensal.")
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

const ReportOutputSchema = z.object({
  summary: z.string().describe("Um resumo executivo da performance da frota no período, com as principais métricas (KM total, custo total, consumo médio)."),
  trends: z.string().describe("Uma análise de tendências observadas nos dados, como variações de custo, desempenho de veículos ou motoristas."),
  recommendations: z.string().describe("Recomendações práticas e acionáveis para otimizar custos, melhorar a eficiência e resolver problemas identificados."),
});
export type ReportOutput = z.infer<typeof ReportOutputSchema>;

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  // Converte os objetos para uma representação JSON string para o prompt
  const recordsString = JSON.stringify(input.records, null, 2);
  const dieselPricesString = JSON.stringify(input.dieselPrices, null, 2);

  return reportFlow({ ...input, recordsString, dieselPricesString });
}

const prompt = ai.definePrompt({
  name: 'reportPrompt',
  input: {
    schema: z.object({
      recordsString: z.string(),
      dieselPricesString: z.string(),
      period: z.string(),
    })
  },
  output: { schema: ReportOutputSchema },
  prompt: `
    Você é um especialista em gestão de frotas e análise de dados para uma empresa de ônibus chamada TopBus.
    Sua tarefa é analisar os dados brutos de viagens e o histórico de preços do diesel para gerar um relatório gerencial claro e objetivo.
    O relatório deve ser para o período {{period}}.

    **Dados Brutos:**

    Registros de Viagem (JSON):
    {{{recordsString}}}

    Preços do Diesel (JSON):
    {{{dieselPricesString}}}

    **Instruções:**

    1.  **Resumo Executivo:** Crie um parágrafo de resumo com as métricas mais importantes. Calcule o KM total rodado, o custo total com combustível (usando o preço mais recente do diesel e um consumo médio de 2.5 KM/L), e a média de KM por litro, se possível.
    2.  **Análise de Tendências:** Descreva as principais tendências. Compare o desempenho com períodos anteriores (se houver dados). Identifique os veículos que mais rodaram ou que tiveram melhor/pior desempenho. Aponte variações de custo.
    3.  **Recomendações:** Forneça de 2 a 3 recomendações claras e práticas. Sugira ações para economia de combustível, manutenção preventiva com base na quilometragem, ou otimização de rotas.

    Seja conciso, profissional e foque em insights que ajudem a diretoria a tomar decisões.
  `,
});

const reportFlow = ai.defineFlow(
  {
    name: 'reportFlow',
    inputSchema: z.object({
        recordsString: z.string(),
        dieselPricesString: z.string(),
        period: z.string(),
    }),
    outputSchema: ReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
