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

El `postinstall` aplica una corrección compatible con la versión instalada de `whatsapp-web.js` para mantener el envío de imágenes funcionando con las versiones recientes de WhatsApp Web. Si ya instalaste las dependencias, ejecuta `npm install` una vez y reinicia el bot.

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

## Among Chat

Among Chat es un juego social por rondas para grupos. Las salas aceptan de 4 a 10 jugadores; una partida asigna 1 impostor hasta 6 jugadores y 2 impostores desde 7. Los roles se entregan por mensaje privado: tripulante, impostor, detective, médico e ingeniero.

En el grupo:

- `!amongus crear`, `!amongus unir` y `!amongus iniciar`: crear sala, unirse e iniciar (solo quien creó la sala puede iniciarla).
- `!amongus estado` y `!amongus cancelar`: consultar la sala o cancelar el lobby.
- `!amongus reunion` y `!amongus votacion`: abrir una discusión y luego una votación.
- `!amongus resolver`: el anfitrión cierra una votación si alguien no votó.
- `!reparar <respuesta>`: resolver en el grupo el desafío de un sabotaje.
- `!amongus perfil`, `!amongus ranking` y `!amongus temporada`: consultar estadísticas y clasificaciones.
- `!amongus tienda`, `!amongus comprar <ID>` y `!amongus equipar <ID>`: comprar cosméticos trimestrales con las monedas ganadas.

Por privado al bot:

- `!tarea` y luego `!tarea <respuesta>`: recibir y resolver tareas de cálculo, descifrado César, buscar el emoji distinto o una simulación de envío de correo (no envía emails reales); cada tripulante puede completar hasta tres.
- `!matar <número>`: acción del impostor.
- `!sabotear luces|reactor|oxigeno`: iniciar un desafío de reparación con límite de 60 segundos.
- `!proteger <número>` (Médico), `!investigar <número>` (Detective) y `!votar <número>`; el número corresponde a la lista de jugadores anunciada en el grupo. Usa `!votar 0` para abstenerte.

La tripulación gana al expulsar a todos los impostores o completar las tareas; los impostores ganan cuando igualan a los tripulantes vivos o vence el sabotaje. Los impostores comparten una acción por ronda. Después de una eliminación hay una ventana de 60 segundos para completar tareas antes de que empiece automáticamente la discusión; una reunión de emergencia puede iniciarla antes. Los jugadores ganan XP, niveles, monedas y logros; hay ranking global y de temporada, además de cosméticos trimestrales que se pueden comprar y equipar. Las salas activas viven en memoria y terminan si se reinicia el bot. Las estadísticas, monedas y cosméticos se guardan en MongoDB si está disponible. Por defecto se intenta `mongodb://localhost:27017/swordbot`; puedes cambiarlo con `MONGODB_URI` en `.env`. Si MongoDB no está disponible, la partida continúa y las estadísticas quedan solo en memoria hasta reiniciar el proceso.

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
- `commands/`: comandos agrupados por funcionalidad. `rone-api/` reúne las consultas de Rone API, `among-chat/` los comandos del juego social, `ahorcado/` el juego de ahorcado y `adivinanza/` los comandos de adivinanzas; los demás comandos generales quedan directamente en esta carpeta.
- `events/`: registro explícito de eventos y manejadores del cliente.
- `services/`: integraciones HTTP externas.
- `utils/`: registro de comandos, formato de mensajes, filtros y lógica de juegos.
- `models/`: esquemas de persistencia.
- `media/`: imágenes y otros recursos estáticos.
- `data/`: datos locales de la aplicación.
- `tests/`: pruebas automatizadas.

Los mensajes usan el formato integrado de WhatsApp (`*negrita*`, `_cursiva_` y emojis); no hace falta instalar una librería de estilos de terminal para cambiar cómo se ven en WhatsApp.

El comando `!todos` utiliza la mención general `@all` sin enumerar los números de los participantes. El aviso depende de que WhatsApp admita esa función en el grupo y en la cuenta vinculada.

Los eventos se registran explícitamente en `events/index.js`. Para agregar un evento, crea su manejador en `events/` y regístralo allí; así el orden y el conjunto de eventos quedan claros y no se cargan archivos auxiliares por accidente.

El bot envía una bienvenida con `media/images/approved.webp` cuando alguien entra y una despedida con `media/images/despedida.PNG` cuando un integrante abandona o es retirado de un grupo. Si WhatsApp no puede enviar la imagen, envía el texto de todos modos.
