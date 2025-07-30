
'use server';
/**
 * @fileOverview Agente de IA para processar parâmetros de consumo de veículos.
 *
 * - processVehicleParameters: Extrai parâmetros de um arquivo.
 * - VehicleParametersInput: O tipo de entrada para a função.
 * - VehicleParametersOutput: O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const VehicleParametersInputSchema = z.object({
  fileDataUri: z.string().describe("O conteúdo de texto do arquivo (PDF, XLSX, CSV) como uma URI de dados."),
});
export type VehicleParametersInput = z.infer<typeof VehicleParametersInputSchema>;

const VehicleParametersOutputSchema = z.object({
  vehicles: z.array(z.object({
    carId: z.string().describe("O identificador do veículo (ex: '10570')."),
    thresholds: z.object({
      yellow: z.number().describe("O valor da meta AMARELA (KM/L), ex: 2.31"),
      green: z.number().describe("O valor da meta VERDE (KM/L), ex: 2.42"),
      gold: z.number().describe("O valor da meta DOURADA (KM/L), ex: 2.54"),
    }).describe("As metas de consumo para o veículo."),
    tankCapacity: z.number().optional().describe("A capacidade do tanque de combustível em litros.")
  })).describe("Uma lista dos parâmetros de veículos extraídos."),
});
export type VehicleParametersOutput = z.infer<typeof VehicleParametersOutputSchema>;


export async function processVehicleParameters(input: VehicleParametersInput): Promise<VehicleParametersOutput> {
  return vehicleParametersFlow(input);
}


const parametersPrompt = ai.definePrompt({
  name: 'vehicleParametersPrompt',
  input: { schema: VehicleParametersInputSchema },
  output: { schema: VehicleParametersOutputSchema },
  prompt: `
    Você é um assistente de extração de dados para a empresa TopBus Transportes.
    Sua tarefa é analisar o conteúdo textual do documento fornecido e extrair os parâmetros de consumo para cada veículo.

    **Instruções Cruciais:**
    1.  **Foco nas Colunas Relevantes:** Analise o texto e encontre as colunas: "VEICULO", "AMARELA", "VERDE", "DOURADA", e "CAPACIDADE TANQUE". Ignore todas as outras colunas. O texto pode estar em formato CSV ou extraído de um PDF.
    2.  **Extração de Dados:** Para cada linha da tabela:
        *   Extraia o número do veículo da coluna "VEICULO" e coloque no campo 'carId'.
        *   Extraia o valor numérico da coluna "AMARELA" e coloque no campo 'thresholds.yellow'.
        *   Extraia o valor numérico da coluna "VERDE" e coloque no campo 'thresholds.green'.
        *   Extraia o valor numérico da coluna "DOURADA" e coloque no campo 'thresholds.gold'.
        *   Extraia o valor numérico da coluna "CAPACIDADE TANQUE" e coloque no campo 'tankCapacity'.
    3.  **Formato de Saída:** Retorne os dados extraídos como uma lista de objetos no formato JSON especificado. Certifique-se de que os valores de consumo sejam números (float), não strings. Substitua vírgulas por pontos nos decimais se necessário.

    **Dados do Documento (em formato texto/csv):**
    {{media url=fileDataUri}}

    Agora, gere a lista de parâmetros de veículos no formato de saída JSON especificado.
  `,
});

const vehicleParametersFlow = ai.defineFlow(
  {
    name: 'vehicleParametersFlow',
    inputSchema: VehicleParametersInputSchema,
    outputSchema: VehicleParametersOutputSchema,
  },
  async (input) => {
    const { output } = await parametersPrompt(input);
    return output!;
  }
);
