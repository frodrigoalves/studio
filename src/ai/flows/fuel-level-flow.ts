
'use server';
/**
 * @fileOverview An AI agent for performing OCR on fuel gauge images.
 *
 * - extractFuelLevelFromImage: Processes an image and extracts the fuel level.
 * - FuelLevelInput: The input type for the function.
 * - FuelLevelOutput: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FuelLevelInputSchema = z.object({
  fuelGaugePhotoDataUri: z
    .string()
    .describe(
      "A photo of a vehicle's dashboard focused on the fuel gauge, as a data URI."
    ),
});
type FuelLevelInput = z.infer<typeof FuelLevelInputSchema>;

const FuelLevelOutputSchema = z.object({
  fuelLevel: z.number().nullable().describe('The estimated fuel level as a percentage (0-100). Should be null if no valid level is found.'),
});
type FuelLevelOutput = z.infer<typeof FuelLevelOutputSchema>;

export async function extractFuelLevelFromImage(input: FuelLevelInput): Promise<FuelLevelOutput> {
  return fuelLevelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fuelLevelPrompt',
  input: { schema: FuelLevelInputSchema },
  output: { schema: FuelLevelOutputSchema },
  prompt: `
    You are a specialized vehicle dashboard analysis assistant. Your task is to analyze the provided image of a fuel gauge and estimate the fuel level as a percentage from 0 to 100.

    Instructions:
    1.  **Analyze the Gauge:** Look at the fuel gauge in the image. The gauge has markings for empty (0 or E) and full (1 or F).
    2.  **Estimate Percentage:** Determine the position of the needle.
        - If the needle is on '0' or 'E', the level is 0%.
        - If the needle is on '1/4', the level is 25%.
        - If the needle is on '1/2', the level is 50%.
        - If the needle is on '3/4', the level is 75%.
        - If the needle is on '1' or 'F', the level is 100%.
    3.  **Interpolate:** If the needle is between markings, estimate the value. For example, if it's halfway between 1/2 and 3/4, the level is approximately 62% or 63%.
    4.  **Return Value:** Return the estimated percentage in the 'fuelLevel' field.
    5.  **Error Handling:** If you cannot clearly see the gauge or the needle, return 'null'.

    **Image to analyze:**
    {{media url=fuelGaugePhotoDataUri}}

    Provide the result in the specified JSON format.
  `,
});


const fuelLevelFlow = ai.defineFlow(
  {
    name: 'fuelLevelFlow',
    inputSchema: FuelLevelInputSchema,
    outputSchema: FuelLevelOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);
        return output!;
    } catch (error) {
        console.error('Error in Fuel Level Flow:', error);
        return { fuelLevel: null };
    }
  }
);
