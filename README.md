# Sword Bot

Bot de WhatsApp hecho con Node.js 20 y `whatsapp-web.js`.

## Requisitos

- Node.js 20
- npm
- Una cuenta de WhatsApp para vincular el bot mediante QR

## Instalación y ejecución

```powershell
npm ci
npm start
```

La primera ejecución muestra un QR. Escanéalo desde **WhatsApp → Dispositivos vinculados**. La sesión local se conserva en `.wwebjs_auth`; no compartas ni publiques esa carpeta.

Para usar `!gemini`, crea un archivo `.env` en la raíz y agrega:

```env
GOOGLE_API_KEY=tu_clave_de_google
```

El comando usa el modelo `gemini-3.8-flash` de la API de Gemini y reintenta hasta dos veces si Google devuelve un error temporal de alta demanda o límite de solicitudes. Si sigue fallando, revisa la consola para ver el detalle del error y vuelve a intentarlo más tarde.

Para buscar el primer resultado de YouTube por nombre, configura una clave de Google Cloud con **YouTube Data API v3** habilitada en `.env`:

```env
YOUTUBE_API_KEY=tu_clave_de_youtube_data_api
```

El comando `!audio <búsqueda>` comparte el título, canal y enlace del primer resultado de YouTube. También acepta enlaces de YouTube y los comparte en formato canónico. No descarga ni adjunta el audio. La API de búsqueda requiere su propia clave habilitada para YouTube Data API v3; la clave de Gemini puede no tener ese acceso.

Los comandos de Mobile Legends consumen la API pública de [Rone Arena](https://arena.rone.dev). No necesitan una clave. Opcionalmente, puedes configurar `RONE_API_BASE_URL` en `.env` para usar otra instancia compatible:

```env
RONE_API_BASE_URL=https://arena.rone.dev
```

Comandos disponibles:

- `!mlrank [rango]`: mejores héroes por win rate (rango `all`, `epic`, `legend`, `mythic`, `honor` o `glory`).
- `!heroe <héroe>`: detalles e imagen del héroe.
- `!mlstats <héroe> [rango]`: win rate, pick rate y ban rate.
- `!mlcounters <héroe> [rango]`: héroes que mejor lo contrarrestan.
- `!mlcompat <héroe> [rango]`: mejores aliados y sinergia.
- `!mlbuild <héroe> <línea> [rango]`: builds para `exp`, `mid`, `roam`, `jungle` o `gold`.
- `!mltendencias <héroe> [rango]`: tendencia reciente del win rate.
- `!mlitems [nombre]`: lista o busca objetos.

Los comandos que consultan un héroe adjuntan su imagen cuando la API la incluye. Rone Arena es un proyecto comunitario no oficial; sus datos y disponibilidad dependen del servicio externo.

## Comandos

Envía `!help` en WhatsApp para ver el menú actualizado de comandos y juegos. Los comandos grupales que necesitan leer miembros del grupo solo funcionan en grupos.

## Pruebas

```powershell
npm test
```

Las pruebas usan dobles locales para WhatsApp y los servicios externos: no envían mensajes reales ni requieren credenciales.

## Estructura

- `index.js`: punto de entrada; carga la configuración y arranca el bot.
- `config/`: carga de variables de entorno y construcción del cliente de WhatsApp.
- `commands/`: comandos disponibles para los usuarios.
- `events/`: registro explícito de eventos y manejadores del cliente.
- `services/`: integraciones HTTP externas.
- `utils/`: registro de comandos, formato de mensajes, filtros y lógica de juegos.
- `models/`: esquemas de persistencia.
- `media/`: imágenes y otros recursos estáticos.
- `data/`: datos locales de la aplicación.
- `tests/`: pruebas automatizadas.

Los mensajes usan el formato integrado de WhatsApp (`*negrita*`, `_cursiva_` y emojis); no hace falta instalar una librería de estilos de terminal para cambiar cómo se ven en WhatsApp.

Los eventos se registran explícitamente en `events/index.js`. Para agregar un evento, crea su manejador en `events/` y regístralo allí; así el orden y el conjunto de eventos quedan claros y no se cargan archivos auxiliares por accidente.
