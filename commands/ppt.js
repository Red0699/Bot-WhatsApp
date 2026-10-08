const { startMatch, getMatch } = require('../utils/pptMatches');

module.exports = {
  name: '!ppt',
  description: 'Reta a otro usuario a jugar Piedra, Papel o Tijera. Ej: !ppt @usuario',
  category: 'Juegos',
  async execute(client, message) {
    if (!message.from.endsWith('@g.us')) return message.reply('❌ Solo puedes usar esto en un grupo');

    const mentions = message.mentionedIds;

    if (!mentions || mentions.length !== 1) {
      return message.reply('⚠️ Debes mencionar a un solo usuario para jugar: `!ppt @usuario`');
    }

    const player1 = message.author;
    const player2 = mentions[0];

    if (!player1 || player1 === player2) {
      return message.reply('⚠️ Debes retar a otro participante del grupo.');
    }

    const existing = getMatch(message.from);
    if (existing) {
      return message.reply('⚔️ Ya hay una partida en curso en este grupo.');
    }

    startMatch(message.from, player1, player2);

    const msg =
      `🎮 *Partida iniciada de Piedra, Papel o Tijera:*\n` +
      `👤 @${player1.split('@')[0]} vs @${player2.split('@')[0]}\n\n` +
      `👉 Ambos deben enviar su jugada con:\n` +
      `*(!jugada piedra | papel | tijera)*`;

    await client.sendMessage(message.from, msg, {
      mentions: [player1, player2]
    });
  }
};
