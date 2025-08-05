
'use server';
/**
 * @fileOverview An AI agent for comparing vehicle photos to detect new damage.
 *
 * - analyzeVehicleDamage: Processes two sets of vehicle photos and identifies differences.
 * - DamageAnalysisInput: The input type for the function.
 * - DamageAnalysisOutput: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PhotoSetSchema = z.object({
  front: z.string().describe("Data URI for the front diagonal photo. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  rear: z.string().describe("Data URI for the rear diagonal photo."),
  left: z.string().describe("Data URI for the left side photo."),
  right: z.string().describe("Data URI for the right side photo."),
});

const DamageAnalysisInputSchema = z.object({
  previousPhotos: PhotoSetSchema.describe("The set of photos from the previous inspection."),
  currentPhotos: PhotoSetSchema.describe("The set of photos from the current inspection."),
});
export type DamageAnalysisInput = z.infer<typeof DamageAnalysisInputSchema>;

const DamageAnalysisOutputSchema = z.object({
  hasNewDamage: z.boolean().describe("Set to true if any new damage is detected between the photo sets."),
  damageDescription: z.string().describe("A detailed, neutral description of any new damage found. If no damage, state that clearly."),
  severity: z.enum(["low", "medium", "high", "none"]).describe("The estimated severity of the new damage."),
  confidenceScore: z.number().min(0).max(1).describe("A confidence score (0.0 to 1.0) of the analysis."),
});
export type DamageAnalysisOutput = z.infer<typeof DamageAnalysisOutputSchema>;


export async function analyzeVehicleDamage(input: DamageAnalysisInput): Promise<DamageAnalysisOutput> {
  return damageAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'vehicleDamageAnalysisPrompt',
  input: { schema: DamageAnalysisInputSchema },
  output: { schema: DamageAnalysisOutputSchema },
  prompt: `
    You are an expert vehicle inspector for a public transport company. Your task is to meticulously compare two sets of photos from the same vehicle, taken at different times, to identify **only new damage**.

    **Previous Inspection Photos:**
    - Front-Diagonal: {{media url=previousPhotos.front}}
    - Rear-Diagonal: {{media url=previousPhotos.rear}}
    - Left-Side: {{media url=previousPhotos.left}}
    - Right-Side: {{media url=previousPhotos.right}}

    **Current Inspection Photos:**
    - Front-Diagonal: {{media url=currentPhotos.front}}
    - Rear-Diagonal: {{media url=currentPhotos.rear}}
    - Left-Side: {{media url=currentPhotos.left}}
    - Right-Side: {{media url=currentPhotos.right}}

    **Analysis Instructions:**
    1.  **Compare Corresponding Pairs:** Compare the "Previous Front-Diagonal" with the "Current Front-Diagonal", and so on for all four pairs.
    2.  **Identify *New* Damage Only:** Your goal is to spot differences that indicate damage that occurred *between* the two inspections. This includes new scratches, dents, cracks, broken mirrors, or significant new stains. Ignore pre-existing damage visible in the 'Previous' photos. Ignore differences in lighting, angle, or reflections unless they reveal new damage.
    3.  **Damage Description:** If you find new damage, describe it neutrally and precisely. For example: "A new 10cm horizontal scratch is visible on the rear passenger door." or "The right-side mirror casing is now cracked, which was not visible in the previous photo." If no new damage is found, state: "No new damage detected after careful comparison."
    4.  **Severity:**
        - **none:** If no new damage is found.
        - **low:** Minor cosmetic issues like small scratches or scuffs.
        - **medium:** Noticeable damage like a significant dent or a long scratch that might require repair.
        - **high:** Critical damage affecting safety or operation, like a broken mirror, flat tire, or large body damage.
    5.  **Confidence Score:** Provide a confidence score from 0.0 to 1.0 on your findings. A high score (e.g., 0.95) means you are very certain about the new damage or lack thereof. A lower score might be used if image quality is poor.

    Produce the final analysis in the specified JSON format.
  `,
});


const damageAnalysisFlow = ai.defineFlow(
  {
    name: 'damageAnalysisFlow',
    inputSchema: DamageAnalysisInputSchema,
    outputSchema: DamageAnalysisOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);
        return output!;
    } catch (error) {
        console.error('Error in Damage Analysis Flow:', error);
        // In case of any other error, return a default 'none' state
        return {
             hasNewDamage: false,
             damageDescription: "AI analysis could not be performed due to an error.",
             severity: "none",
             confidenceScore: 0,
        };
    }
  }
);
