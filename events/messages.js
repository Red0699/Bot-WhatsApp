const { getCommand } = require('../utils/commandRegistry');
const { detectarPalabraProhibida } = require('../utils/wordFilter');
const text = require('../utils/whatsappText');

module.exports = (client) => {
  client.on('message', async (message) => {
    const body = typeof message.body === 'string' ? message.body.trim() : '';
    const commandName = body.split(/\s+/, 1)[0].toLowerCase();

    if (commandName.startsWith('!')) {
      const command = getCommand(commandName);
      if (command) {
        try {
          await command.execute(client, message);
        } catch (error) {
          console.error(`❌ Error al ejecutar ${commandName}:`, error);
          try {
            await message.reply(text.error('No pude completar ese comando. Inténtalo de nuevo.'));
          } catch (replyError) {
            console.error(`❌ No pude responder al error de ${commandName}:`, replyError);
          }
        }
      }
    }

    const chatId = message.from || message.id?.remote;

    if (!message.fromMe && chatId?.endsWith('@g.us')) {
      const palabraDetectada = detectarPalabraProhibida(body);

      if (palabraDetectada) {
        try {
          const adminId = '573214663210@c.us';
          const remitenteId = message.author;
          const numeroRemitente = remitenteId?.split('@')[0] || 'desconocido';

          const alerta =
            `🚨 *Palabra detectada: ${palabraDetectada}*\n\n` +
            `📨 Mensaje: "${body}"\n` +
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
