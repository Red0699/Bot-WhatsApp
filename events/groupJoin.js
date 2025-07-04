module.exports = (client) => {
  client.on('group_join', async (notification) => {
    try {
      const chat = await notification.getChat();
      const contact = await notification.getContact();

      const nombre = contact.pushname || contact.number;
      const mensajeBienvenida = `👋 ¡Bienvenido(a) @${contact.number} al grupo *${chat.name}*! 🎉\n\nEspero te quedes a gusto con nosotros :).`;

      await chat.sendMessage(mensajeBienvenida, {
        mentions: [contact]
      });
    } catch (error) {
      console.error('❌ Error en group_join:', error);
    }
  });
};
