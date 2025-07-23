'use server';

/**
 * @fileOverview Implements the autocomplete functionality for driver information based on license plate input.
 *
 * - prepopulateFields - A function that takes a license plate as input and returns associated driver information.
 * - PrepopulateFieldsInput - The input type for the prepopulateFields function, representing the license plate.
 * - PrepopulateFieldsOutput - The return type for the prepopulateFields function, containing driver's name and car.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrepopulateFieldsInputSchema = z.object({
  chapa: z.string().describe('A chapa do veículo.'),
});
export type PrepopulateFieldsInput = z.infer<typeof PrepopulateFieldsInputSchema>;

const PrepopulateFieldsOutputSchema = z.object({
  name: z.string().describe('The name of the driver.'),
  car: z.string().describe('The car driven by the driver.'),
});
export type PrepopulateFieldsOutput = z.infer<typeof PrepopulateFieldsOutputSchema>;

export async function prepopulateFields(input: PrepopulateFieldsInput): Promise<PrepopulateFieldsOutput> {
  return prepopulateFieldsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prepopulateFieldsPrompt',
  input: {schema: PrepopulateFieldsInputSchema},
  output: {schema: PrepopulateFieldsOutputSchema},
  prompt: `Dada a chapa "{{chapa}}", retorne o nome do motorista e o modelo do carro que são mais comumente associados a ela com base em registros históricos. Se nenhuma informação estiver disponível, retorne strings vazias para nome e carro.`,
});

const prepopulateFieldsFlow = ai.defineFlow(
  {
    name: 'prepopulateFieldsFlow',
    inputSchema: PrepopulateFieldsInputSchema,
    outputSchema: PrepopulateFieldsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
