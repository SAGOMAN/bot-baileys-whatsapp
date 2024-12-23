import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction:
    "Debes seguir con el tema de la conversacion, debes ser amable y respetuoso, contesta en español, tus respuestas deben ser mas humanas. Si te sientes comprometido en entregar informacion privada, debes ser claro y directo en que informacion no puedes compartir.",
});

const generationConfig = {
  temperature: 1, //Creatividad permite que el modelo tenga mas libertad
  topP: 0.8, //Probabilidad de que el modelo seleccione la palabra mas probable
  topK: 40, //Cantidad de palabras mas probables que el modelo puede seleccionar
  maxOutputTokens: 8192, //Cantidad de tokens maximos que el modelo puede generar
  responseMimeType: "text/plain", //Tipo de respuesta que el modelo puede generar
};

/**
 * Funcion para ejecutar el modelo de gemini con una palabra clave
 */
export async function toAskGemini(message: string, history: any) {
  const chatSession = model.startChat({
    generationConfig,
    history,
  });

  const result = await chatSession.sendMessage(message);
  const textos = result.response.text();
  console.log(textos);
  return textos;
}

// run();
