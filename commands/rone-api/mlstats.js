const roneApi = require('../../services/roneApi');
const { createRoneCommand } = require('../../utils/roneCommand');
const {
  recordsFrom,
  heroName,
  heroImage,
  percent,
  rankName,
  replyWithImage,
  unwrapRecord
} = require('../../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!mlstats',
  description: 'Consulta win rate, pick rate y ban rate de un héroe',
  usage: '!mlstats <héroe> [rango]',
  execute: async (client, message, args) => {
    const ranks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    const lastArgument = roneApi.normalizeRank(args[args.length - 1]);
    const rank = ranks.includes(lastArgument) ? lastArgument : 'all';
    const heroNameQuery = ranks.includes(lastArgument) ? args.slice(0, -1).join(' ') : args.join(' ');
    if (!heroNameQuery) return message.reply('⚠️ Indica el nombre del héroe.');

    const result = await roneApi.getHeroStatistics(heroNameQuery, rank);
    const record = recordsFrom(result)[0];
    if (!record) return message.reply('No hay estadísticas disponibles para ese héroe y rango.');

    const data = unwrapRecord(record);
    const caption =
      `📊 *${heroName(record)} · ${rankName(rank)}*\n` +
      `🏆 Win rate: ${percent(data.main_hero_win_rate)}\n` +
      `🎯 Pick rate: ${percent(data.main_hero_appearance_rate)}\n` +
      `🚫 Ban rate: ${percent(data.main_hero_ban_rate)}`;

    await replyWithImage(client, message, heroImage(record), caption);
  }
});
