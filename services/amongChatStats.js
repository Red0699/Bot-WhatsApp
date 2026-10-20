const mongoose = require('mongoose');
const AmongChatProfile = require('../models/AmongChatProfile');

const memoryProfiles = new Map();
let connectionPromise;

function currentSeasonId(date = new Date()) {
  const seasonNumber = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-T${seasonNumber}`;
}

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swordbot';
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 })
      .then(() => undefined)
      .finally(() => {
        connectionPromise = undefined;
      });
  }

  await connectionPromise;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

function updateMemoryProfile(user, result) {
  const profile = memoryProfiles.get(user.id) || {
    userId: user.id,
    name: user.name,
    matches: 0,
    wins: 0,
    losses: 0,
    tasksCompleted: 0,
    xp: 0,
    coins: 0,
    seasonId: currentSeasonId(),
    seasonXp: 0,
    seasonWins: 0,
    cosmetics: [],
    equippedCosmetic: '',
    achievements: []
  };

  if (profile.seasonId !== currentSeasonId()) {
    profile.seasonId = currentSeasonId();
    profile.seasonXp = 0;
    profile.seasonWins = 0;
  }
  const previousMatches = profile.matches;
  profile.name = user.name || profile.name;
  profile.matches += 1;
  profile.wins += result.won ? 1 : 0;
  profile.losses += result.won ? 0 : 1;
  profile.tasksCompleted += user.tasksCompleted;
  profile.xp += result.won ? 100 + user.tasksCompleted * 5 : 20 + user.tasksCompleted * 5;
  profile.coins += result.won ? 30 + user.tasksCompleted * 2 : 5 + user.tasksCompleted;
  profile.seasonXp += result.won ? 100 + user.tasksCompleted * 5 : 20 + user.tasksCompleted * 5;
  profile.seasonWins += result.won ? 1 : 0;
  if (previousMatches === 0) profile.achievements.push('primera-partida');
  if (result.won && profile.wins === 1) profile.achievements.push('primera-victoria');
  if (user.tasksCompleted >= 3) profile.achievements.push('tres-tareas');
  memoryProfiles.set(user.id, profile);
  return profile;
}

async function recordMatch(players, winner) {
  const updates = players.map((player) => {
    const won = winner === 'IMPOSTOR'
      ? player.role === 'IMPOSTOR'
      : player.role !== 'IMPOSTOR';
    const xp = (won ? 100 : 20) + player.tasksCompleted * 5;
    const coins = (won ? 30 : 5) + (won ? player.tasksCompleted * 2 : player.tasksCompleted);
    const seasonId = currentSeasonId();
    const result = { won, xp, coins };
    const profile = updateMemoryProfile(player, result);
    const achievements = player.tasksCompleted >= 3 ? ['tres-tareas'] : [];

    return {
      player,
      won,
      xp,
      achievements,
      updateOne: {
        filter: { userId: player.id },
        update: [{
          $set: {
            userId: player.id,
            name: player.name,
            matches: { $add: [{ $ifNull: ['$matches', 0] }, 1] },
            wins: { $add: [{ $ifNull: ['$wins', 0] }, won ? 1 : 0] },
            losses: { $add: [{ $ifNull: ['$losses', 0] }, won ? 0 : 1] },
            tasksCompleted: { $add: [{ $ifNull: ['$tasksCompleted', 0] }, player.tasksCompleted] },
            xp: { $add: [{ $ifNull: ['$xp', 0] }, xp] },
            coins: { $add: [{ $ifNull: ['$coins', 0] }, (won ? 30 : 5) + (won ? player.tasksCompleted * 2 : player.tasksCompleted)] },
            seasonXp: {
              $add: [
                { $cond: [{ $eq: ['$seasonId', seasonId] }, { $ifNull: ['$seasonXp', 0] }, 0] },
                xp
              ]
            },
            seasonWins: {
              $add: [
                { $cond: [{ $eq: ['$seasonId', seasonId] }, { $ifNull: ['$seasonWins', 0] }, 0] },
                won ? 1 : 0
              ]
            },
            seasonId,
            cosmetics: { $ifNull: ['$cosmetics', []] },
            equippedCosmetic: { $ifNull: ['$equippedCosmetic', ''] },
            achievements: {
              $setUnion: [
                { $ifNull: ['$achievements', []] },
                {
                  $concatArrays: [
                    achievements,
                    { $cond: [{ $eq: [{ $ifNull: ['$matches', 0] }, 0] }, ['primera-partida'], []] },
                    { $cond: [{ $and: [won, { $eq: [{ $ifNull: ['$wins', 0] }, 0] }] }, ['primera-victoria'], []] }
                  ]
                }
              ]
            },
            updatedAt: new Date()
          }
        }],
        upsert: true
      },
      profile
    };
  });

  try {
    await connectDatabase();
    await AmongChatProfile.bulkWrite(updates.map(({ updateOne }) => ({ updateOne })));
  } catch (error) {
    console.error('❌ No se pudieron guardar las estadísticas de Among Chat en MongoDB:', error.message);
  }

  return updates.map(({ profile }) => profile);
}

async function buyCosmetic(userId, cosmeticId, cost) {
  const existingProfile = await getProfile(userId);
  if (!existingProfile || existingProfile.coins < cost) return { success: false, reason: 'fondos' };
  if (existingProfile.cosmetics?.includes(cosmeticId)) return { success: false, reason: 'comprado' };

  try {
    await connectDatabase();
    const profile = await AmongChatProfile.findOneAndUpdate(
      { userId, coins: { $gte: cost }, cosmetics: { $ne: cosmeticId } },
      { $inc: { coins: -cost }, $addToSet: { cosmetics: cosmeticId } },
      { new: true }
    ).lean();
    if (!profile) return { success: false, reason: 'fondos' };
    memoryProfiles.set(userId, profile);
  } catch (error) {
    console.error('❌ No se pudo comprar el cosmético de Among Chat en MongoDB:', error.message);
    existingProfile.coins -= cost;
    existingProfile.cosmetics = [...(existingProfile.cosmetics || []), cosmeticId];
    memoryProfiles.set(userId, existingProfile);
  }
  return { success: true };
}

async function equipCosmetic(userId, cosmeticId) {
  const existingProfile = await getProfile(userId);
  if (!existingProfile?.cosmetics?.includes(cosmeticId)) {
    return { success: false, reason: 'no-comprado' };
  }

  try {
    await connectDatabase();
    const profile = await AmongChatProfile.findOneAndUpdate(
      { userId, cosmetics: cosmeticId },
      { $set: { equippedCosmetic: cosmeticId } },
      { new: true }
    ).lean();
    if (!profile) return { success: false, reason: 'no-comprado' };
    memoryProfiles.set(userId, profile);
  } catch (error) {
    console.error('❌ No se pudo equipar el cosmético de Among Chat en MongoDB:', error.message);
    existingProfile.equippedCosmetic = cosmeticId;
    memoryProfiles.set(userId, existingProfile);
  }
  return { success: true };
}

async function getProfile(userId) {
  try {
    await connectDatabase();
    const profile = await AmongChatProfile.findOne({ userId }).lean();
    if (profile) {
      memoryProfiles.set(userId, profile);
      return profile;
    }
  } catch (error) {
    console.error('❌ No se pudo consultar el perfil de Among Chat en MongoDB:', error.message);
  }

  return memoryProfiles.get(userId) || null;
}

async function getLeaderboard(limit = 10, seasonOnly = false) {
  try {
    await connectDatabase();
    const filter = seasonOnly ? { seasonId: currentSeasonId() } : {};
    const sort = seasonOnly ? { seasonXp: -1, seasonWins: -1 } : { xp: -1, wins: -1 };
    return await AmongChatProfile.find(filter)
      .sort(sort)
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('❌ No se pudo consultar el ranking de Among Chat en MongoDB:', error.message);
    return [...memoryProfiles.values()]
      .filter((profile) => !seasonOnly || profile.seasonId === currentSeasonId())
      .sort((a, b) => seasonOnly
        ? b.seasonXp - a.seasonXp || b.seasonWins - a.seasonWins
        : b.xp - a.xp || b.wins - a.wins)
      .slice(0, limit);
  }
}

module.exports = {
  buyCosmetic,
  currentSeasonId,
  disconnectDatabase,
  equipCosmetic,
  getLeaderboard,
  getProfile,
  recordMatch
};
