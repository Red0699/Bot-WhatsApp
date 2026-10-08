module.exports = {
  name: '!grupo',
  description: 'Muestra el nombre y la cantidad de miembros del grupo.',
  category: 'Utilidades',
  async execute(client, message) {
    if (!message.from.endsWith('@g.us')) {
      await message.reply('Este comando solo funciona en grupos.');
      return;
    }

    try {
      const chat = await client.getChatById(message.from);
      await message.reply(`👥 Este grupo se llama *${chat.name}* y tiene ${chat.participants.length} participantes.`);
    } catch (error) {
      console.error('❌ Error al obtener los datos del grupo:', error);
      await message.reply('⚠️ No pude cargar los datos del grupo. Inténtalo de nuevo.');
    }
  }
};
