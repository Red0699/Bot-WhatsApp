module.exports = {
  name: '!grupo',
  description: 'Muestra el nombre y la cantidad de miembros del grupo.',
  category: 'Utilidades',
  async execute(client, message) {
    const chat = await message.getChat();
    if (chat.isGroup) {
      await message.reply(`👥 Este grupo se llama *${chat.name}* y tiene ${chat.participants.length} participantes.`);
    } else {
      await message.reply('Este comando solo funciona en grupos.');
    }
  }
};
