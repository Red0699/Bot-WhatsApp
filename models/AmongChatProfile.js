const mongoose = require('mongoose');

const AmongChatProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Tripulante' },
  matches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  seasonId: { type: String, default: '' },
  seasonXp: { type: Number, default: 0 },
  seasonWins: { type: Number, default: 0 },
  cosmetics: { type: [String], default: [] },
  equippedCosmetic: { type: String, default: '' },
  achievements: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.AmongChatProfile ||
  mongoose.model('AmongChatProfile', AmongChatProfileSchema);
