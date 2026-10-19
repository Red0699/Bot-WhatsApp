const roneApi = require('../services/roneApi');
const { createRoneCommand } = require('../utils/roneCommand');
const {
  recordsFrom,
  heroName,
  heroImage,
  percent,
  replyWithImage,
  unwrapRecord,
  rankName
} = require('../utils/roneFormatting');

const lanes = {
  exp: 'EXP Lane',
  mid: 'Mid Lane',
  roam: 'Roam',
  jungle: 'Jungle',
  gold: 'Gold Lane'
};

module.exports = createRoneCommand({
  name: '!mlbuild',
  description: 'Recomienda builds de un héroe según línea y rango',
  usage: '!mlbuild <héroe> <exp|mid|roam|jungle|gold> [rango]',
  execute: async (client, message, args) => {
    const ranks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    const lastArgument = roneApi.normalizeRank(args[args.length - 1]);
    const rank = ranks.includes(lastArgument) ? lastArgument : 'all';
    const laneIndex = ranks.includes(lastArgument) ? args.length - 2 : args.length - 1;
    const lane = String(args[laneIndex] || '').toLowerCase();
    const identifier = args.slice(0, laneIndex).join(' ');

    if (!identifier || !lanes[lane]) {
      return message.reply(`⚠️ Uso: !mlbuild <héroe> <${Object.keys(lanes).join('|')}> [rango]`);
    }

    const [result, items, hero] = await Promise.all([
      roneApi.getHeroBuilds(identifier, lane, rank),
      roneApi.getItems(),
      roneApi.getHero(identifier)
    ]);
    const builds = recordsFrom(result);
    if (!builds.length) return message.reply('No hay builds disponibles para ese héroe, línea y rango.');

    const itemNames = new Map(items.map(item => [String(item.equipid), item.equipname]));
    const list = builds.slice(0, 3).map((record, index) => {
      const data = unwrapRecord(record);
      const buildItems = Array.isArray(data.build) ? data.build[0]?.equipid : data.equipid;
      const equipment = Array.isArray(buildItems)
        ? buildItems.map(id => itemNames.get(String(id)) || `Objeto #${id}`)
        : [];
      const rates = data.build?.[0] || data;
      const parts = [`${index + 1}. ${equipment.join(' → ') || 'Equipo sin detalle'}`];
      if (rates.build_win_rate !== undefined) parts.push(`WR ${percent(rates.build_win_rate)}`);
      if (rates.build_pick_rate !== undefined) parts.push(`uso ${percent(rates.build_pick_rate)}`);
      if (rates.battleskill?.data?.__data?.skillname) {
        parts.push(`hechizo ${rates.battleskill.data.__data.skillname}`);
      }
      return parts.join(' · ');
    }).join('\n');
    const caption = `🧰 *Builds de ${heroName(hero || builds[0])} · ${lanes[lane]} · ${rankName(rank)}*\n${list}`;

    await replyWithImage(client, message, heroImage(hero), caption);
  }
});
