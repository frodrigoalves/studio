
'use server';
/**
 * @fileOverview An AI agent for performing Optical Character Recognition (OCR) on images.
 *
 * - extractOdometerFromImage: Processes an image and extracts the odometer reading and fuel level.
 * - OcrInput: The input type for the function.
 * - OcrOutput: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const OcrInputSchema = z.object({
  odometerPhotoDataUri: z
    .string()
    .describe(
      "A photo of a vehicle's dashboard, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   fuelGaugePhotoDataUri: z
    .string()
    .describe(
        "A photo of the vehicle's fuel gauge, as a data URI."
    ),
});
export type OcrInput = z.infer<typeof OcrInputSchema>;

const OcrOutputSchema = z.object({
  odometer: z.number().nullable().describe('The extracted odometer reading as a number. Should be null if no valid number is found.'),
  fuelLevel: z.string().nullable().describe('The estimated fuel level as a descriptive string (e.g., "25%", "50%", "Full"). Should be null if not determinable.'),
});
export type OcrOutput = z.infer<typeof OcrOutputSchema>;

export async function extractOdometerFromImage(input: OcrInput): Promise<OcrOutput> {
  return ocrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ocrPrompt',
  input: { schema: OcrInputSchema },
  output: { schema: OcrOutputSchema },
  prompt: `
    You are a highly specialized vehicle dashboard analysis assistant. Your task is to analyze the provided images and extract two key pieces of information: the odometer reading and the fuel level.

    Instructions:
    1.  **Odometer Extraction (from Odometer Photo):**
        *   Analyze the odometer photo to find the main numerical display.
        *   Extract ONLY the numbers. Ignore any other text, symbols, or units (like "km" or "mi").
        *   If the number has decimal points or commas, remove them. For example, "123,456.7" should become "123456".
        *   Return the final number in the 'odometer' field.
        *   If you cannot find a clear number, return 'null' for the 'odometer' field.

    2.  **Fuel Level Estimation (from Fuel Gauge Photo):**
        *   Analyze the fuel gauge photo. The gauge uses 'E' on the left for Empty and 'F' on the right for Full.
        *   The main gauge to analyze is the smaller circular one, usually below the larger rev counter, identified by a fuel pump icon.
        *   Estimate the fuel level based on the needle's position.
        *   Express the level as a percentage string (e.g., "0%", "25%", "50%", "75%", "100%").
        *   Return this string in the 'fuelLevel' field.
        *   If the fuel gauge is not visible or its level cannot be determined, return 'null' for the 'fuelLevel' field.

    **Images to analyze:**
    Odometer Photo:
    {{media url=odometerPhotoDataUri}}

    Fuel Gauge Photo:
    {{media url=fuelGaugePhotoDataUri}}

    Provide the result in the specified JSON format.
  `,
});


const ocrFlow = ai.defineFlow(
  {
    name: 'ocrFlow',
    inputSchema: OcrInputSchema,
    outputSchema: OcrOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);
        return output!;
    } catch (error) {
        console.error('Error in OCR Flow:', error);
        // In case of any other error, return null to prevent crashes
        return { odometer: null, fuelLevel: null };
    }
  }
);
