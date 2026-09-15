# Conector KREO — Instagram

Este es el "Conector" que conecta tu Vendedor IA a Instagram. Forma parte del kit
**KREO — Crea tu Vendedor IA**. Si llegaste aquí desde la guía, no necesitas leer nada
de este archivo — solo haz clic en el botón de abajo.

## Instalar (sin programar)

[![Deploy con Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/eurorondon/conector-kreo-instagram&env=META_PAGE_ACCESS_TOKEN,META_VERIFY_TOKEN,OPENAI_API_KEY,SYSTEM_PROMPT&envDescription=Estos%20datos%20los%20consigues%20siguiendo%20la%20L%C3%A1mina%208%20de%20tu%20gu%C3%ADa%20KREO&envLink=https://github.com/eurorondon/conector-kreo-instagram%23readme)

Sigue la **Lámina 8** de tu guía — ahí está el paso a paso completo de qué pegar en
cada campo.

## Verificar que quedó bien instalado

Abre `https://tu-conector.vercel.app/` (con tu propio dominio) — debe decir
**"Conector KREO activo ✅"**.

---

## Nota para Kreo (no forma parte del kit del comprador)

- `envLink` del botón de deploy apunta a este mismo README por ahora — cuando la guía
  completa tenga una URL pública, cambiar `envLink` para que apunte directo ahí.
- Pendiente: probar el flujo de "Deploy to Vercel" de punta a punta con una cuenta de
  prueba antes de entregarlo a un comprador real.
- `META_IG_USER_ID` y `META_APP_SECRET` quedan en `.env.example` mencionados en la guía
  pero el servidor todavía no los usa (el primero es informativo, el segundo queda
  reservado para cuando se valide la firma de las peticiones de Meta — no es
  estrictamente necesario para el MVP).
- Sin base de datos ni Redis a propósito: el negocio del comprador queda 100%
  configurado vía variables de entorno (`SYSTEM_PROMPT`), sin estado que persistir.
