// Conector KREO — Instagram
//
// Servidor mínimo: recibe mensajes de Instagram vía Meta, le pregunta a Google Gemini
// usando el Prompt Maestro personalizado del negocio, y responde en la misma conversación.
//
// Decisiones deliberadas (lecciones de Hellokreo, ver Obsidian
// "06-Proyectos/Hellokreo/Despliegue Vercel - gotchas"):
// - Procesamiento SÍNCRONO: se espera la respuesta completa antes de contestar 200 a
//   Meta. Un "responder 200 ya y seguir en background" (waitUntil) perdió respuestas en
//   silencio en producción — no se repite ese patrón acá.
// - module.exports = app directamente (no un objeto envuelto), o el deploy en Vercel
//   revienta con FUNCTION_INVOCATION_FAILED.

const express = require('express');
const { renderPrivacyPage } = require('./privacy');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;
const BUSINESS_NAME = process.env.BUSINESS_NAME;

// Guarda contra eco de la propia app: a veces Meta reenvía el mensaje que la propia
// app mandó, y a veces llega SIN la marca is_echo (bug observado en Hellokreo) —
// por eso además de chequear is_echo, se recuerdan las últimas respuestas propias.
const recentBotReplies = new Set();
const ECHO_GUARD_MS = 60_000;

app.get('/', (_req, res) => {
  res.status(200).send('Conector KREO activo ✅');
});

app.get('/privacy', (_req, res) => {
  res.status(200).type('html').send(renderPrivacyPage(BUSINESS_NAME));
});

// Paso "Pega el link de tu Conector" de la guía — Meta llama a este endpoint para
// verificar la URL antes de aceptarla.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Mensajes reales de Instagram llegan por acá.
app.post('/webhook', async (req, res) => {
  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        await handleMessagingEvent(event); // sin waitUntil, a propósito (ver nota arriba)
      }
    }
  } catch (err) {
    console.error('[Conector KREO] Error procesando webhook:', err);
  }
  // Se responde al final, ya con todo procesado.
  res.sendStatus(200);
});

async function handleMessagingEvent(event) {
  // Ignora eventos sin mensaje (ej. message_edit) — no vienen con event.message.
  if (!event || !event.message) return;
  if (event.message.is_echo) return;

  const text = event.message.text;
  const senderId = event.sender && event.sender.id;
  if (!text || !senderId) return;

  const replyKey = `${senderId}:${text}`;
  if (recentBotReplies.has(replyKey)) return;

  if (!GEMINI_API_KEY || !SYSTEM_PROMPT) {
    console.error('[Conector KREO] Falta GEMINI_API_KEY o SYSTEM_PROMPT en las variables de entorno.');
    return;
  }

  const reply = await askGemini(text);
  if (!reply) return;

  recentBotReplies.add(`${senderId}:${reply}`);
  setTimeout(() => recentBotReplies.delete(`${senderId}:${reply}`), ECHO_GUARD_MS);

  await sendInstagramMessage(senderId, reply);
}

async function askGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    console.error('[Conector KREO] Error de Gemini:', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function sendInstagramMessage(recipientId, text) {
  const url = `https://graph.instagram.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    console.error('[Conector KREO] Error enviando mensaje a Instagram:', response.status, await response.text());
  }
}

module.exports = app;

// Servidor local (Vercel invoca `module.exports` directamente y nunca llega a este
// bloque en producción — esto es solo para correrlo con `npm run dev`).
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Conector KREO escuchando en http://localhost:${port}`));
}
