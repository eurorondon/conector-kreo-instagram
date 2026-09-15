// Página de política de privacidad genérica, servida en /privacy.
// Meta exige una URL de política de privacidad para publicar la app — esta plantilla
// evita que el comprador (no técnico) tenga que crear una desde cero.
// Personalizable vía la variable de entorno BUSINESS_NAME (opcional).

function renderPrivacyPage(businessName) {
  const name = businessName || 'este negocio';
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Política de Privacidad</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.1rem; margin-top: 1.6em; }
    p { color: #333; }
  </style>
</head>
<body>
  <h1>Política de Privacidad</h1>
  <p>Esta página describe cómo ${escapeHtml(name)} maneja la información de los mensajes
  recibidos a través de su asistente virtual en Instagram.</p>

  <h2>Qué información se recibe</h2>
  <p>Se recibe el contenido de los mensajes que los clientes envían por Instagram
  (texto), junto con un identificador de la conversación, con el único fin de responder
  a esa consulta.</p>

  <h2>Cómo se usa</h2>
  <p>La información se usa exclusivamente para generar una respuesta automática a través
  de un modelo de inteligencia artificial (OpenAI) y no se comparte con terceros ni se
  usa con fines distintos a la atención al cliente.</p>

  <h2>Contacto</h2>
  <p>Para dudas sobre esta política, contacta directamente a ${escapeHtml(name)} a través
  de sus canales habituales.</p>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { renderPrivacyPage };
