
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
  trends: z.string().describe("Uma análise de anomalias, destacando de forma clara e visível os motoristas, carros e rotas que apresentaram o maior consumo ou o pior desempenho (menor KM/L)."),
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
    Você é um assistente de IA para Guilherme, analista de dados da TopBus Transportes, uma empresa de transporte público coletivo com ônibus.
    Seu principal objetivo é analisar os dados brutos de viagens para identificar **divergências e anomalias** no consumo de combustível e no desempenho das rotas.
    O relatório deve ser claro, direto e focado em apresentar os pontos de maior atenção para o período {{period}}.

    **Dados Brutos:**

    Registros de Viagem (JSON):
    {{{recordsString}}}

    Preços do Diesel (JSON):
    {{{dieselPricesString}}}

    **Instruções para Guilherme:**

    1.  **Resumo Geral (summary):** Apresente um resumo conciso com as métricas essenciais: KM total rodado, custo total estimado com combustível (baseado no preço mais recente e um consumo médio de 2.5 KM/L), e o consumo médio geral da frota.
    2.  **Análise de Anomalias (trends):** Esta é a seção mais importante. Identifique e liste de forma clara e visível os motoristas, carros e rotas (se inferível) que apresentaram o **maior consumo** ou o pior desempenho (menor KM/L). Use marcadores ou uma lista para destacar os pontos mais críticos.
    3.  **Recomendações e Pontos de Investigação (recommendations):** Com base nas anomalias, sugira de 2 a 3 ações ou pontos de investigação para o Guilherme. Por exemplo: "Verificar o carro X que apresentou consumo 20% acima da média" ou "Analisar a rota do motorista Y para entender a causa do baixo desempenho".

    Seja um parceiro proativo para o Guilherme, ajudando-o a encontrar os problemas que precisam de atenção imediata.
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
