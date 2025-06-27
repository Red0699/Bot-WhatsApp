module.exports = {
  name: '!todos',
  description: 'Menciona a todos los miembros del grupo.',
  async execute(client, message) {
    const chat = await message.getChat();

    if (!chat.isGroup) {
      await message.reply('❌ Este comando solo se puede usar en grupos.');
      return;
    }

    // Obtener lista de participantes
    const mentions = [];
    let text = '📢 *Atención todos:*\n\n';

    for (const participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);
      mentions.push(contact);
      text += `@${contact.number} `;
    }

    await chat.sendMessage(text.trim(), { mentions });
  }
};
