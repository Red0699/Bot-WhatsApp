const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');

module.exports = (client) => {
  client.on('group_join', async (notification) => {
    try {
      const chat = await notification.getChat();
      const participantId = notification.id.participant;
      const contact = await client.getContactById(participantId);
      
      // Obtener número del nuevo miembro
      const numero = contact?.number || participantId.replace(/@c\.us$/, '');

      const mensajeBienvenida = 
        `👋 ¡Bienvenido(a) @${numero} al grupo *Team Sword Colombia*! 🎉\n\n` +
        `Espero te quedes a gusto con nosotros 😁`;

      // Imágen
      const imagePath = path.join(__dirname, '../media/images/approved.webp');
      const media = MessageMedia.fromFilePath(imagePath);

      // Obtener todos los participantes del grupo
      const members = await chat.participants;

      // Obtener todos los contactos 
      const allContacts = await Promise.all(
        members.map(m => client.getContactById(m.id._serialized))
      );

      // Agregar el contacto nuevo también, por si acaso no está aún en la lista
      if (contact) {
        allContacts.push(contact);
      }

      // Eliminar duplicados
      const uniqueMentions = Array.from(
        new Map(allContacts.map(c => [c.id._serialized, c])).values()
      );

      await chat.sendMessage(media, {
        caption: mensajeBienvenida,
        mentions: uniqueMentions
      });

    } catch (error) {
      console.error('❌ Error en group_join:', error);
    }
  });
};
