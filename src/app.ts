import "dotenv/config"; // Importar la configuración de variables de entorno
import { join } from "path";
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  utils,
  EVENTS, //Palabras clave para el chatbot
} from "@builderbot/bot";
import { MysqlAdapter as Database } from "@builderbot/database-mysql";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import ffmpeg from "fluent-ffmpeg";
import { existsSync, unlinkSync } from "fs";
import fs from 'fs/promises';

import { GlobalServices } from "./services/global";
import { toAskGemini } from "./ai/gemini";
import { fromAudioToText } from "./ai/groq";
import { toAudio } from "./ai/elevenlabs";

const PORT = process.env.PORT ?? 3008;

const discordFlow = addKeyword<Provider, Database>("doc").addAnswer(
  [
    "You can see the documentation here",
    "📄 https://builderbot.app/docs \n",
    "Do you want to continue? *yes*",
  ].join("\n"),
  { capture: true },
  async (ctx, { gotoFlow, flowDynamic }) => {
    if (ctx.body.toLocaleLowerCase().includes("yes")) {
      return gotoFlow(registerFlow);
    }
    await flowDynamic("Thanks!");
    return;
  }
);

/**
 * Funcion de bienvenida, el bot responde con un saludo y le da la bienvenida al usuario
 */
const welcomeFlow = addKeyword<Provider, Database>(EVENTS.WELCOME).addAction(
  async (ctx, { flowDynamic }) => {
    const message = ctx.body;
    const italianMeesage = await toAskGemini(message, []);
    await flowDynamic(italianMeesage); // aqui se envia el mensaje de bot a cliente
  }
);
//   .addAnswer(`🙌 Hello welcome to this *Chatbot*`)

/**
 * Funcion para detectar nota de voz
 */
/**
 * Funcion de bienvenida, el bot responde con un saludo y le da la bienvenida al usuario
 */
const voiceFlow = addKeyword<Provider, Database>(EVENTS.VOICE_NOTE).addAction(
  async (ctx, { flowDynamic, provider }) => {
    try {
      const storagePath = join(process.cwd(), "storage");
      const saveFilePath = await provider.saveFile(ctx, {
        path: storagePath,
      });

      if (!existsSync(saveFilePath)) {
        console.error("Error: El archivo original no se guardó correctamente");
        await flowDynamic("Lo siento, hubo un error al procesar el audio");
        return;
      }

      // Crear el nombre del archivo convertido
      const outputPath = saveFilePath.replace(".oga", ".wav");

      // Convertir el archivo usando ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(saveFilePath)
          .toFormat("wav")
          .audioChannels(1) // Mono audio
          .audioFrequency(16000) // Frecuencia común para reconocimiento de voz
          .on("end", () => {
            console.log("Conversión completada");
            resolve(true);
          })
          .on("error", (err) => {
            console.error("Error en la conversión:", err);
            reject(err);
          })
          .save(outputPath);
      });

      if (!existsSync(outputPath)) {
        throw new Error("El archivo convertido no se generó");
      }

      // Usar el archivo convertido para el reconocimiento de voz
      const text = await fromAudioToText(outputPath);
      const italianMessage = await toAskGemini(text, []);
      
      // Obtener el buffer de audio
      const audioBuffer = await toAudio(italianMessage);
      
      // Guardar el buffer en un archivo temporal
      const audioOutputPath = join(process.cwd(), 'storage', `response_${Date.now()}.mp3`);
      await fs.writeFile(audioOutputPath, audioBuffer);

      // Enviar respuesta al usuario
      if (text) {
        await flowDynamic(`${text}`);
        await flowDynamic(italianMessage);
        await flowDynamic([{
          body: "Hola, te escuche esto en italiano",
          media: audioOutputPath
        }]);

        // Limpiar todos los archivos generados
        try {
          await fs.unlink(audioOutputPath); // Eliminar archivo de respuesta
          await fs.unlink(saveFilePath);    // Eliminar archivo original .oga
          await fs.unlink(outputPath);      // Eliminar archivo convertido .wav
          
        } catch (cleanupError) {
          console.error("Error al limpiar archivos de audio:", cleanupError);
        }
      } else {
        await flowDynamic("No pude entender el mensaje de voz");
      }
    } catch (error) {
      console.error("Error en el procesamiento de audio:", error);
      await flowDynamic(
        "Lo siento, hubo un error al procesar el mensaje de voz"
      );
    }
  }
);

const registerFlow = addKeyword<Provider, Database>(
  utils.setEvent("REGISTER_FLOW")
)
  .addAnswer(
    `What is your name?`,
    { capture: true },
    async (ctx, { state }) => {
      await state.update({ name: ctx.body });
    }
  )
  .addAnswer("What is your age?", { capture: true }, async (ctx, { state }) => {
    await state.update({ age: ctx.body });
  })
  .addAction(async (_, { flowDynamic, state }) => {
    await flowDynamic(
      `${state.get(
        "name"
      )}, thanks for your information!: Your age: ${state.get("age")}`
    );
  });

const fullSamplesFlow = addKeyword<Provider, Database>([
  "samples",
  utils.setEvent("SAMPLES"),
])
  .addAnswer(`💪 I'll send you a lot files...`)
  .addAnswer(`Send image from Local`, {
    media: join(process.cwd(), "assets", "sample.png"),
  })
  .addAnswer(`Send video from URL`, {
    media:
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4",
  })
  .addAnswer(`Send audio from URL`, {
    media: "https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3",
  })
  .addAnswer(`Send file from URL`, {
    media:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  });

/**
 * La funcion principal
 */
const main = async () => {
  const adapterFlow = createFlow([welcomeFlow, voiceFlow]);

  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database({
    host: GlobalServices.getInstance().db_host,
    user: GlobalServices.getInstance().db_user,
    database: GlobalServices.getInstance().db_database,
    password: GlobalServices.getInstance().db_password,
    port: GlobalServices.getInstance().db_port,
  });

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end("sended");
    })
  );

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
