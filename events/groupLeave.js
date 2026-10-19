const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const { getGroupId } = require('../utils/groupNotification');

module.exports = (client) => {
  client.on('group_leave', async (notification) => {
    try {
      const groupId = getGroupId(notification);
      if (!groupId) {
        throw new Error('La notificación de despedida no contiene un ID de grupo válido.');
      }

      const count = notification.recipientIds?.length || 1;
      const isPlural = count > 1;
      const subject = isPlural ? `${count} integrantes` : 'Un integrante';
      const action = notification.type === 'leave'
        ? `${isPlural ? 'han' : 'ha'} abandonado el grupo`
        : notification.type === 'remove'
          ? `${isPlural ? 'han sido expulsados' : 'ha sido expulsado'} del grupo`
          : `${isPlural ? 'han salido o han sido retirados' : 'ha salido o ha sido retirado'} del grupo`;
      const mensajeDespedida = `👋 ${subject} ${action}.`;
      const imagePath = path.join(__dirname, '../media/images/despedida.PNG');
      const media = MessageMedia.fromFilePath(imagePath);

      try {
        await client.sendMessage(groupId, media, { caption: mensajeDespedida });
      } catch (error) {
        console.error('❌ No se pudo enviar la imagen de despedida:', error);
        await client.sendMessage(groupId, mensajeDespedida);
      }
    } catch (error) {
      console.error('❌ Error en group_leave:', error);
    }
  });
};
