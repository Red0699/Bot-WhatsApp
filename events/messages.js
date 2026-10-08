const fs = require('fs');
const path = require('path');
const { detectarPalabraProhibida } = require('../utils/wordFilter');

module.exports = (client) => {
  client.on('message', async (message) => {
    const command = message.body.split(' ')[0].toLowerCase();
    const commandsPath = path.join(__dirname, '..', 'commands');

    try {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const cmd = require(path.join(commandsPath, file));
        if (command === cmd.name) {
          await cmd.execute(client, message);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error al ejecutar el comando:', error);
    }

    const chatId = message.from || message.id?.remote;
    const texto = typeof message.body === 'string' ? message.body : '';

    if (!message.fromMe && chatId?.endsWith('@g.us')) {
      const palabraDetectada = detectarPalabraProhibida(texto);

      if (palabraDetectada) {
        try {
          const adminId = '573214663210@c.us';
          const remitenteId = message.author;
          const numeroRemitente = remitenteId?.split('@')[0] || 'desconocido';

          const alerta =
            `🚨 *Palabra detectada*\n\n` +
            `📨 Mensaje: "${texto}"\n` +
            `👤 Enviado por: @${numeroRemitente}`;

          await client.sendMessage(chatId, alerta, {
            mentions: remitenteId ? [adminId, remitenteId] : [adminId]
          });
        } catch (error) {
          console.error('❌ Error al verificar la palabra en el grupo:', error);
        }
      }
    }
  });
};
