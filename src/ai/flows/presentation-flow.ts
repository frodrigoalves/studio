
'use server';
/**
 * @fileOverview Um agente de IA para criar resumos de apresentação.
 *
 * - generatePresentationSummary: Processa texto e/ou um arquivo e gera um resumo.
 * - PresentationInput: O tipo de entrada para a função.
 * - PresentationOutput: O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PresentationInputSchema = z.object({
  repositoryContent: z.string().describe("O conteúdo de texto bruto do repositório (anotações, links, etc.).").optional(),
  fileDataUri: z.string().describe("O conteúdo do arquivo como uma URI de dados (pode ser CSV, imagem, PDF, etc.).").optional(),
});
export type PresentationInput = z.infer<typeof PresentationInputSchema>;


const PresentationOutputSchema = z.object({
  title: z.string().describe("Um título geral para a apresentação ou resumo gerado."),
  summary: z.string().describe('Um resumo executivo dos principais pontos e insights encontrados no material fornecido.'),
  talkingPoints: z.array(z.string()).describe('Uma lista de pontos de discussão chave ou tópicos a serem abordados na reunião, formatados como uma lista com marcadores.'),
  nextSteps: z.array(z.string()).describe('Uma lista de ações recomendadas ou próximos passos com base na análise.'),
});
export type PresentationOutput = z.infer<typeof PresentationOutputSchema>;

export async function generatePresentationSummary(input: PresentationInput): Promise<PresentationOutput> {
  return presentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'presentationPrompt',
  input: { schema: PresentationInputSchema },
  output: { schema: PresentationOutputSchema },
  prompt: `
    Você é um assistente de IA especialista em preparar resumos executivos para reuniões de diretoria para o Guilherme, analista de dados da TopBus Transportes.
    Seu objetivo é consolidar as informações fornecidas (texto bruto e/ou um arquivo) em um resumo claro, conciso e acionável para a apresentação semanal.

    Primeiro, analise todo o conteúdo disponível. Se um arquivo for fornecido (PDF, imagem, etc.), use OCR para extrair o texto. Combine essa informação com o texto do campo de anotações.

    Foco da Análise:
    1.  **Síntese de Informações:** Consolide os dados de todas as fontes em um resumo coeso. Identifique os temas e métricas mais importantes.
    2.  **Identificação de Insights:** Vá além do óbvio. Conecte os pontos. Se as anotações mencionam um problema e os dados de um arquivo o confirmam, destaque essa conexão.
    3.  **Estrutura para Ação:** Organize a saída de forma que o Guilherme possa usá-la diretamente em sua apresentação.

    O relatório final deve conter:
    -   **title:** Um título claro para a apresentação. Ex: "Resumo Semanal da Operação - Foco em Custos e Manutenção".
    -   **summary:** Um parágrafo de resumo executivo.
    -   **talkingPoints:** Uma lista de 3 a 5 pontos chave que Guilherme deve apresentar. Ex: "Aumento de 15% nos custos de manutenção do Veículo X", "Motorista Y com desempenho 10% acima da média", etc.
    -   **nextSteps:** 2 a 3 recomendações ou próximos passos a serem sugeridos à diretoria.

    **Conteúdo do Repositório (Anotações):**
    {{{repositoryContent}}}

    {{#if fileDataUri}}
    **Conteúdo do Arquivo Anexado:**
    {{media url=fileDataUri}}
    {{/if}}

    Agora, gere o resumo da apresentação no formato de saída JSON especificado.
  `,
});

const presentationFlow = ai.defineFlow(
  {
    name: 'presentationFlow',
    inputSchema: PresentationInputSchema,
    outputSchema: PresentationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
