
'use server';
/**
 * @fileOverview An AI agent for creating institutional videos.
 *
 * - generateInstitutionalVideo: Processes a script and generates a narrated video.
 * - VideoInput: The input type for the function.
 * - VideoOutput: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import * as fs from 'fs';
import { Readable } from 'stream';
import wav from 'wav';
import { v4 as uuidv4 } from 'uuid';

const VideoInputSchema = z.object({
  script: z.string().describe("The full script for the video narration."),
  prompt: z.string().describe("A prompt describing the desired visuals for the video."),
});
type VideoInput = z.infer<typeof VideoInputSchema>;

const VideoOutputSchema = z.object({
  videoUrl: z.string().describe("The URL of the generated MP4 video."),
  audioUrl: z.string().describe("The URL of the generated WAV audio narration."),
});
type VideoOutput = z.infer<typeof VideoOutputSchema>;

// Helper function to convert SRT to plain text
const srtToPlainText = (srt: string): string => {
  return srt
    .replace(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g, '') // Remove timestamps
    .replace(/\d+\s/g, '') // Remove sequence numbers
    .replace(/<[^>]*>/g, '') // Remove any HTML tags
    .replace(/\n\n/g, '\n') // Normalize newlines
    .trim();
};

export async function generateInstitutionalVideo(input: VideoInput): Promise<VideoOutput> {
  return videoGenerationFlow(input);
}


async function textToSpeech(text: string): Promise<string> {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: text,
    });
    if (!media) {
      throw new Error('TTS failed to return media');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const wavBase64 = await toWav(audioBuffer);
    return `data:audio/wav;base64,${wavBase64}`;
}


async function generateVideo(prompt: string): Promise<string> {
    let { operation } = await ai.generate({
        model: googleAI.model('veo-3.0-generate-preview'),
        prompt: prompt,
        config: {
            aspectRatio: '16:9',
            personGeneration: 'allow_adult',
            numberOfVideos: 1,
        },
    });

    if (!operation) {
        throw new Error('Expected the model to return an operation');
    }

    while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
        operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
        throw new Error('failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media) {
        throw new Error('Failed to find the generated video');
    }
    
    return video.media.url; // This is a gs:// URL
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
}

const videoGenerationFlow = ai.defineFlow(
  {
    name: 'videoGenerationFlow',
    inputSchema: VideoInputSchema,
    outputSchema: VideoOutputSchema,
  },
  async (input) => {
    try {
        const plainTextScript = srtToPlainText(input.script);
        
        // Generate audio and video in parallel
        const [audioUrl, videoUrl] = await Promise.all([
            textToSpeech(plainTextScript),
            generateVideo(input.prompt)
        ]);

        return { videoUrl, audioUrl };

    } catch (error) {
        console.error("Error in video generation flow:", error);
        throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

    