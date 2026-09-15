# Conector KREO — Instagram

Este es el "Conector" que conecta tu Vendedor IA a Instagram. Forma parte del kit
**KREO — Crea tu Vendedor IA**. Si llegaste aquí desde la guía, no necesitas leer nada
de este archivo — solo haz clic en el botón de abajo.

## Instalar (sin programar)

Sigue la **Lámina 8** de tu guía — ahí está el paso a paso completo. Resumen:

1. Haz clic en **"Fork"** (arriba a la derecha de este repo) para crear tu propia copia.
2. Ve a [vercel.com](https://vercel.com) → inicia sesión con la misma cuenta de GitHub.
3. **"Add New..." → "Project"** → busca tu copia (tu fork) → **"Import"**.
4. Pega estas 4 variables (los nombres exactos, uno por uno):
   - `META_PAGE_ACCESS_TOKEN`
   - `META_VERIFY_TOKEN`
   - `GEMINI_API_KEY`
   - `SYSTEM_PROMPT`
5. Clic en **"Deploy"**.

> ⚠️ Antes usábamos el botón "Deploy to Vercel" de un clic, pero en pruebas reales
> falla con el error "el repositorio es privado o no existe" cuando la cuenta de
> Vercel/GitHub del comprador tiene su instalación de la app de Vercel limitada a
> "solo repositorios seleccionados" (muy común). El camino Fork + Import de arriba es
> más largo por 2-3 clics pero funciona siempre, sin depender de esos permisos.

## Verificar que quedó bien instalado

Abre `https://tu-conector.vercel.app/` (con tu propio dominio) — debe decir
**"Conector KREO activo ✅"**.

---

## Nota para Kreo (no forma parte del kit del comprador)

- Probado en vivo 2026-09-15: el botón "Deploy to Vercel" (clone automático) falla con
  cuentas de Vercel/GitHub que tienen la instalación de la GitHub App limitada a "solo
  repositorios seleccionados" — error "el repositorio es privado o no existe" aunque el
  repo es público. Se reemplazó por Fork + Import como método principal (más robusto).
- Efecto secundario de este cambio: como Import no tiene `envDescription`/`envLink`
  (esos parámetros solo existen en el flujo de "Deploy"), el comprador debe escribir el
  nombre de cada variable a mano — por eso la Lámina 8 los lista explícitamente.
- Probado en vivo 2026-09-15 (parte 2): Vercel detecta las variables a rellenar
  directamente desde `.env.example`, así que en un momento tuvo 8 campos (incluía
  `META_IG_USER_ID` y `META_APP_SECRET`, que el servidor nunca usa) y confundía al
  comprador sobre cuáles eran obligatorias. Se limpió `.env.example` a solo lo que el
  código usa de verdad: 4 obligatorias + 2 opcionales. Regla para el futuro: todo lo que
  se agregue a este archivo aparece tal cual en el formulario de Vercel del comprador.
- Sin base de datos ni Redis a propósito: el negocio del comprador queda 100%
  configurado vía variables de entorno (`SYSTEM_PROMPT`), sin estado que persistir.
