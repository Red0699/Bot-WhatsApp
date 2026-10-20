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
  name: '!mlrank',
  description: 'Muestra los héroes con mayor win rate de un rango',
  usage: '!mlrank [all|epic|legend|mythic|honor|glory]',
  requiresArgs: false,
  execute: async (client, message, args) => {
    const rank = roneApi.normalizeRank(args[0] || 'all');
    const allowedRanks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    if (!allowedRanks.includes(rank)) {
      return message.reply('⚠️ Rango no válido. Usa all, epic, legend, mythic, honor o glory.');
    }

    const result = await roneApi.getRankStatistics({ rank, days: '7', size: 5 });
    const records = recordsFrom(result);
    if (!records.length) return message.reply('No hay estadísticas disponibles para ese rango.');

    const list = records.map((record, index) => {
      const data = unwrapRecord(record);
      return `${index + 1}. *${heroName(record)}* — WR ${percent(data.main_hero_win_rate)} | pick ${percent(data.main_hero_appearance_rate)} | ban ${percent(data.main_hero_ban_rate)}`;
    }).join('\n');
    const caption = `🏆 *Mejores héroes · ${rankName(rank)} · últimos 7 días*\n${list}`;

    await replyWithImage(client, message, heroImage(records[0]), caption);
  }
});
