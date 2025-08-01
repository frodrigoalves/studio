
'use server';
/**
 * @fileOverview An AI agent for performing Optical Character Recognition (OCR) on images.
 *
 * - extractOdometerFromImage: Processes an image and extracts the odometer reading.
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
});
export type OcrInput = z.infer<typeof OcrInputSchema>;

const OcrOutputSchema = z.object({
  odometer: z.number().nullable().describe('The extracted odometer reading as a number. Should be null if no valid number is found.'),
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
    You are a highly specialized vehicle dashboard analysis assistant. Your task is to analyze the provided image and extract the odometer reading.

    Instructions:
    1.  **Odometer Extraction:**
        *   Analyze the odometer photo to find the main numerical display.
        *   Extract ONLY the numbers. Ignore any other text, symbols, or units (like "km" or "mi").
        *   If the number has decimal points or commas, remove them. For example, "123,456.7" should become "123456".
        *   Return the final number in the 'odometer' field.
        *   If you cannot find a clear number, return 'null' for the 'odometer' field.

    **Image to analyze:**
    Odometer Photo:
    {{media url=odometerPhotoDataUri}}

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
        return { odometer: null };
    }
  }
);
