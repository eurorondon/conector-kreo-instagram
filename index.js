// Conector KREO — Instagram
//
// Servidor mínimo: recibe mensajes de Instagram vía Meta, le pregunta a DeepSeek
// usando el Prompt Maestro personalizado del negocio, y responde en la misma conversación.
//
// Se usa DeepSeek en vez de Gemini (decisión 2026-09-16): Google Cloud exige elegir un
// país al crear el proyecto —incluso para el tier gratis— y Venezuela (mercado objetivo
// de Kreo) no aparece en esa lista. DeepSeek no pide país en ningún paso del registro ni
// del pago, solo tarjeta/PayPal — sí requiere cargar saldo (no tiene tier gratis, se
// confirmó `402 Insufficient Balance` con $0), pero con ~$2 alcanza para probarlo.
//
// Decisiones deliberadas (lecciones de Hellokreo, ver Obsidian
// "06-Proyectos/Hellokreo/Despliegue Vercel - gotchas"):
// - Procesamiento SÍNCRONO: se espera la respuesta completa antes de contestar 200 a
//   Meta. Un "responder 200 ya y seguir en background" (waitUntil) perdió respuestas en
//   silencio en producción — no se repite ese patrón acá.
// - module.exports = app directamente (no un objeto envuelto), o el deploy en Vercel
//   revienta con FUNCTION_INVOCATION_FAILED.

const express = require('express');
const path = require('path');
const { renderPrivacyPage } = require('./privacy');

const app = express();
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
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

// Temporal: vista previa de la guía mientras se decide dónde publicarla de forma
// definitiva (Canva/Figma). Borrar esta ruta y guia.html cuando ya no se necesite.
app.get('/guia', (_req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'guia.html'));
});

// Landing de venta del infoproducto — Pago Móvil + Binance, verificación manual
// por WhatsApp (sin pasarela de pago todavía). Borrar cuando se migre a un
// checkout real (Hotmart/Payhip/PagoFácil) o a un proyecto/dominio propio.
app.get('/comprar', (_req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'comprar.html'));
});

// Página de entrega del kit — link único que se manda por WhatsApp tras
// confirmar el pago manualmente (no listada en ningún lado público). El
// middleware express.static de arriba sirve los archivos dentro de /kit
// (ej. /kit/Prompt-Maestro-y-Plantillas.txt); esta ruta sirve la página en sí.
app.get('/kit', (_req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'kit.html'));
});
app.use('/kit', express.static(path.join(__dirname, 'kit')));

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

  if (!DEEPSEEK_API_KEY || !SYSTEM_PROMPT) {
    console.error('[Conector KREO] Falta DEEPSEEK_API_KEY o SYSTEM_PROMPT en las variables de entorno.');
    return;
  }

  const reply = await askDeepSeek(text);
  if (!reply) return;

  recentBotReplies.add(`${senderId}:${reply}`);
  setTimeout(() => recentBotReplies.delete(`${senderId}:${reply}`), ECHO_GUARD_MS);

  await sendInstagramMessage(senderId, reply);
}

async function askDeepSeek(userText) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.error('[Conector KREO] Error de DeepSeek:', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
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
