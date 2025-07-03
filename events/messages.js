const fs = require('fs');
const palabrasProhibidas = require('../utils/palabrasClave');

module.exports = (client) => {
  client.on('message', async (message) => {
    const chat = await message.getChat();

    // Función para limpiar el texto del mensaje
    const normalizarTexto = (texto) =>
      texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') 
        .toLowerCase();

    // Detección de palabras 
    if (chat.isGroup && !message.fromMe) {
      const textoLimpio = normalizarTexto(message.body);
      const palabraDetectada = palabrasProhibidas.find(p => textoLimpio.includes(normalizarTexto(p)));

      if (palabraDetectada) {
        const adminId = '573214663210@c.us';
        const remitente = await message.getContact();

        const alerta = 
          `🚨 *Palabra detectada*\n\n` +
          `📨 Mensaje: "${message.body}"\n` +
          `👤 Enviado por: @${remitente.number}`;

        await chat.sendMessage(alerta, {
          mentions: [await client.getContactById(adminId), remitente]
        });
      }
    }

    // Comandos
    const command = message.body.split(' ')[0].toLowerCase();
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const cmd = require(`../commands/${file}`);
      if (command === cmd.name) {
        cmd.execute(client, message);
      }
    }
  });
};
