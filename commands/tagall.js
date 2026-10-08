module.exports = {
  name: '!todos',
  description: 'Menciona a todos los miembros del grupo.',
  category: 'Utilidades',
  async execute(client, message) {
    if (!message.from.endsWith('@g.us')) {
      await message.reply('❌ Este comando solo se puede usar en grupos.');
      return;
    }

    try {
      const chat = await client.getChatById(message.from);
      const mentions = [];
      let text = '📢 *Atención todos:*\n\n';

      for (const participant of chat.participants) {
        const contact = await client.getContactById(participant.id._serialized);
        mentions.push(contact);
        text += `@${contact.number} `;
      }

      await client.sendMessage(message.from, text.trim(), { mentions });
    } catch (error) {
      console.error('❌ Error al mencionar a los participantes del grupo:', error);
      await message.reply('⚠️ No pude cargar los participantes del grupo. Inténtalo de nuevo.');
    }
  }
};
