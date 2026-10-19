const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const { getGroupId } = require('../utils/groupNotification');

module.exports = (client) => {
  client.on('group_join', async (notification) => {
    try {
      const groupId = getGroupId(notification);
      if (!groupId) {
        throw new Error('La notificación de bienvenida no contiene un ID de grupo válido.');
      }

      const mensajeBienvenida = 
        `👋 ¡Bienvenido(a) al grupo *Team Sword Colombia*! 🎉\n\n` +
        `Espero te quedes a gusto con nosotros 😁`;

      const imagePath = path.join(__dirname, '../media/images/approved.webp');
      const media = MessageMedia.fromFilePath(imagePath);

      try {
        await client.sendMessage(groupId, media, { caption: mensajeBienvenida });
      } catch (error) {
        console.error('❌ No se pudo enviar la imagen de bienvenida:', error);
        await client.sendMessage(groupId, mensajeBienvenida);
      }
    } catch (error) {
      console.error('❌ Error en group_join:', error);
    }
  });
};
