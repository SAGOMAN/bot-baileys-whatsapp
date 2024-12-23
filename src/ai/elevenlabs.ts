import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function toAudio(text: string): Promise<Buffer> {
  const voiceId = "JBFqnCBsd6RMkjVDRZzb";
  
  try {
    const response = await client.textToSpeech.convert(voiceId, {
      output_format: "mp3_44100_128",
      text: text,
      model_id: "eleven_multilingual_v2",
    });
    
    // Convertir ReadableStream a Buffer
    const chunks = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
    
  } catch (error) {
    console.error('Error en la conversión de texto a voz:', error);
    throw new Error('No se pudo convertir el texto a audio');
  }
}