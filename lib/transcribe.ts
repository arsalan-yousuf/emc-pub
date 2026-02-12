"use server";

import { createClient } from "@deepgram/sdk";

function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "DEEPGRAM_API_KEY is not set. Add it in Azure App Service Configuration → Application settings."
    );
  }
  return createClient(apiKey);
}

export async function transcribeAudio(file: File, language: 'de' | 'en' = 'de') {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const deepgram = getDeepgramClient();
    const response = await deepgram.listen.prerecorded.transcribeFile(buffer, {
      model: "nova-3",
      smart_format: true,
      language: language,
      detect_language: false,
      punctuate: true,
      paragraphs: true,
      diarize: false,
      multichannel: false,
    });

    if (response.result) {
      return response.result.results.channels[0].alternatives[0].transcript;
    }
    throw new Error("Transcription failed: no result from Deepgram");
  } catch (err) {
    // Log full error server-side (visible in Azure Log stream / Application Insights)
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[transcribeAudio]", message, stack);
    // Re-throw a safe message for the client (no API/key leakage)
    if (message.includes("DEEPGRAM_API_KEY")) {
      throw err;
    }
    throw new Error(`Transcription failed: ${message}`);
  }
}
