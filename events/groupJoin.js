const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');

module.exports = (client) => {
  client.on('group_join', async (notification) => {
    try {
      const participantIds = Array.isArray(notification.recipientIds)
        ? notification.recipientIds
        : [];
      const participants = participantIds.length ? participantIds : [notification.author].filter(Boolean);
      const mentions = participants
        .map(id => typeof id === 'string' ? id : id?._serialized)
        .filter(id => typeof id === 'string' && id.endsWith('@c.us'));
      const mentionText = mentions.map(id => `@${id.split('@')[0]}`).join(' ');

      const mensajeBienvenida = 
        `👋 ¡Bienvenido(a)${mentionText ? ` ${mentionText}` : ''} al grupo *Team Sword Colombia*! 🎉\n\n` +
        `Espero te quedes a gusto con nosotros 😁`;

      const imagePath = path.join(__dirname, '../media/images/approved.webp');
      const media = MessageMedia.fromFilePath(imagePath);

      await notification.reply(media, {
        caption: mensajeBienvenida,
        mentions
      });
    } catch (error) {
      console.error('❌ Error en group_join:', error);
    }
  });
};
