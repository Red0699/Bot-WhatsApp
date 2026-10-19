module.exports = {
  name: '!todos',
  description: 'Menciona al grupo con @all, sin enumerar a cada participante.',
  category: 'Utilidades',
  async execute(client, message) {
    if (!message.from?.endsWith('@g.us')) {
      await message.reply('❌ Este comando solo se puede usar en grupos.');
      return;
    }

    try {
      await client.sendMessage(message.from, '📢 *Atención a todos:*\n\n@all', {
        extra: { nonJidMentions: 1 }
      });
    } catch (error) {
      console.error('❌ Error al enviar la mención general del grupo:', error);
      await message.reply('⚠️ No pude mencionar a todos en este grupo. Inténtalo de nuevo.');
    }
  }
};
