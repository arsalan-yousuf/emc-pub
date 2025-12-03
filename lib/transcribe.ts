"use server";

import { createClient } from "@deepgram/sdk";
import { revalidatePath } from "next/cache";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribeAudio(file: File, language: 'de' | 'en' = 'de') {
  const buffer = Buffer.from(await file.arrayBuffer());

  const response = await deepgram.listen.prerecorded.transcribeFile(buffer, {
    model: "nova-3",       // high accuracy + fast
    smart_format: true,  // punctuation, formatting
    language: language,  // German or English
    detect_language: false, // Don't auto-detect, use specified language
    punctuate: true,     // Add punctuation
    paragraphs: true,    // Add paragraph breaks
    diarize: false,      // No speaker diarization needed
    multichannel: false, // Single channel audio
  });

  if (response.result) {
    return response.result.results.channels[0].alternatives[0].transcript;
  } else {
    throw new Error('Transcription failed');
  }
}
