const { startMatch, getMatch } = require('../utils/pptMatches');

module.exports = {
  name: '!ppt',
  description: 'Reta a otro usuario a jugar Piedra, Papel o Tijera. Ej: !ppt @usuario',
  category: 'Juegos',
  async execute(client, message) {
    const chat = await message.getChat();
    if (!chat.isGroup) return message.reply('❌ Solo puedes usar esto en un grupo');

    const mentions = message.mentionedIds;

    if (!mentions || mentions.length !== 1) {
      return message.reply('⚠️ Debes mencionar a un solo usuario para jugar: `!ppt @usuario`');
    }

    const player1 = message.author || message.from;
    const player2 = mentions[0];

    const existing = getMatch(chat.id._serialized);
    if (existing) {
      return message.reply('⚔️ Ya hay una partida en curso en este grupo.');
    }

    startMatch(chat.id._serialized, player1, player2);

    const player1Name = player1.split('@')[0];
    const player2Name = player2.split('@')[0];

    const msg =
      `🎮 *Partida iniciada de Piedra, Papel o Tijera:*\n` +
      `👤 ${player1Name} vs ${player2Name}\n\n` +
      `👉 Ambos deben enviar su jugada con:\n` +
      `*¡jugada piedra | papel | tijera*`;

    await message.reply(msg); // 👈 sin `mentions`
  }
};
