const { submitMove, getMatchByPlayer, deleteMatch } = require('../utils/pptMatches');

module.exports = {
  name: '!jugada',
  description: 'Envía tu jugada en privado al bot',
  category: 'Comandos para jugar',
  async execute(client, message) {
    // Solo se permite por privado
    const chat = await message.getChat();
    if (chat.isGroup) {
      return message.reply('⚠️ Este comando solo funciona por privado.');
    }

    const args = message.body.trim().split(' ');
    const move = args[1]?.toLowerCase();

    if (!['piedra', 'papel', 'tijera'].includes(move)) {
      return message.reply('❌ Movimiento inválido. Usa: !jugada piedra | papel | tijera');
    }

    const playerId = message.from;

    const [grupoId, match] = getMatchByPlayer(playerId) || [];
    if (!match) {
      return message.reply('⚠️ No estás en una partida activa.');
    }

    const result = submitMove(grupoId, playerId, move);
    if (!result) {
      return message.reply('✅ Jugada registrada. Esperando al otro jugador...');
    }

    // Ambos jugaron
    const [p1, p2] = result.players;
    const m1 = result.moves[p1];
    const m2 = result.moves[p2];

    const resolve = (a, b) => {
      if (a === b) return 0;
      if (
        (a === 'piedra' && b === 'tijera') ||
        (a === 'papel' && b === 'piedra') ||
        (a === 'tijera' && b === 'papel')
      ) return 1;
      return 2;
    };

    const winner = resolve(m1, m2);
    const p1Name = p1.split('@')[0];
    const p2Name = p2.split('@')[0];

    let resultMsg = `🎮 *Resultado de Piedra, Papel o Tijera:*\n`;
    resultMsg += `• ${p1Name} eligió *${m1}*\n`;
    resultMsg += `• ${p2Name} eligió *${m2}*\n\n`;

    resultMsg += winner === 0
      ? '🤝 ¡Empate!'
      : `🏆 ¡Gana ${winner === 1 ? p1Name : p2Name}!`;

    // ✅ Enviar al grupo
    const groupChat = await client.getChatById(grupoId);
    await groupChat.sendMessage(resultMsg);

    deleteMatch(grupoId);
  }
};
// Este comando permite a los jugadores enviar su jugada en privado al bot.
// El bot verifica si ambos jugadores han jugado y determina el ganador.