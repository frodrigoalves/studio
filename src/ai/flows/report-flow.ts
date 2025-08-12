
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

const ReportInputSchema = z.object({
  records: z.array(z.any()).describe("Uma lista de objetos de registro de viagem."),
  dieselPrices: z.array(z.any()).describe("Uma lista de objetos de preço do diesel."),
  vehicleParameters: z.array(z.any()).describe("Uma lista dos parâmetros de cada veículo (consumo, etc.)."),
  period: z.enum(["daily", "weekly", "monthly"]).describe("O período para a análise do relatório: diário, semanal ou mensal.")
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

const ReportOutputSchema = z.object({
  summary: z.string().describe("Um resumo executivo da performance da frota no período, com as principais métricas (KM total, custo total, consumo médio)."),
  trends: z.string().describe("Uma análise de anomalias, destacando de forma clara e visível os motoristas, carros e rotas que apresentaram o maior consumo ou o pior desempenho (menor KM/L) em relação às suas metas individuais."),
  recommendations: z.string().describe("Recomendações práticas e acionáveis para otimizar custos, melhorar a eficiência e resolver problemas identificados."),
});
export type ReportOutput = z.infer<typeof ReportOutputSchema>;

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  // Converte os objetos para uma representação JSON string para o prompt
  const recordsString = JSON.stringify(input.records, null, 2);
  const dieselPricesString = JSON.stringify(input.dieselPrices, null, 2);
  const vehicleParametersString = JSON.stringify(input.vehicleParameters, null, 2);


  return reportFlow({ 
      recordsString, 
      dieselPricesString, 
      vehicleParametersString,
      period: input.period 
  });
}

const prompt = ai.definePrompt({
  name: 'reportPrompt',
  input: {
    schema: z.object({
      recordsString: z.string(),
      dieselPricesString: z.string(),
      vehicleParametersString: z.string(),
      period: z.string(),
    })
  },
  output: { schema: ReportOutputSchema },
  prompt: `
    Você é um assistente de IA para Guilherme, analista de dados da TopBus Transportes, uma empresa de transporte público coletivo com ônibus.
    Seu principal objetivo é analisar os dados brutos de viagens para identificar **divergências e anomalias** no consumo de combustível, cruzando os dados de viagem com os parâmetros de consumo específicos de cada veículo.
    O relatório deve ser claro, direto e focado em apresentar os pontos de maior atenção para o período {{period}}.

    **Dados Brutos:**

    Registros de Viagem (JSON):
    {{{recordsString}}}

    Preços do Diesel (JSON):
    {{{dieselPricesString}}}
    
    Parâmetros dos Veículos (JSON - Contém a meta de consumo 'green' para cada carro):
    {{{vehicleParametersString}}}


    **Instruções para Guilherme:**

    1.  **Resumo Geral (summary):** Apresente um resumo conciso com as métricas essenciais: KM total rodado, custo total estimado com combustível (baseado no preço mais recente do diesel e no consumo **individual** de cada veículo, conforme a meta 'green' nos parâmetros), e o consumo médio geral da frota (KM total / litros totais abastecidos, se disponível).
    2.  **Análise de Anomalias (trends):** Esta é a seção mais importante. Para cada viagem, calcule o consumo real (KM rodado / litros gastos, se possível). Compare o consumo real com a meta de consumo 'green' do veículo (disponível em vehicleParameters). Identifique e liste de forma clara os motoristas e carros que mais se desviaram (para pior) de suas metas individuais. Destaque os casos mais críticos.
    3.  **Recomendações e Pontos de Investigação (recommendations):** Com base nas anomalias (desvios das metas individuais), sugira de 2 a 3 ações ou pontos de investigação para o Guilherme. Por exemplo: "Verificar o carro X, que consumiu 20% a mais que sua meta de consumo" ou "Analisar a rota do motorista Y para entender a causa do baixo desempenho em relação à meta do seu veículo".

    Seja um parceiro proativo para o Guilherme, ajudando-o a encontrar os problemas que precisam de atenção imediata.
  `,
});

const reportFlow = ai.defineFlow(
  {
    name: 'reportFlow',
    inputSchema: z.object({
        recordsString: z.string(),
        dieselPricesString: z.string(),
        vehicleParametersString: z.string(),
        period: z.string(),
    }),
    outputSchema: ReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

    