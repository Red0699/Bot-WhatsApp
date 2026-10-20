const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const AmongChatProfile = require('../models/AmongChatProfile');
const stats = require('../services/amongChatStats');

test('Among Chat calcula el ID de temporada por trimestre', () => {
  assert.equal(stats.currentSeasonId(new Date('2026-01-01T00:00:00Z')), '2026-T1');
  assert.equal(stats.currentSeasonId(new Date('2026-10-19T00:00:00Z')), '2026-T4');
});

test('Among Chat genera actualizaciones persistentes con XP, monedas, temporada y logros', async () => {
  const originalConnect = mongoose.connect;
  const originalBulkWrite = AmongChatProfile.bulkWrite;
  let writes;
  mongoose.connect = async () => mongoose;
  AmongChatProfile.bulkWrite = async (operations) => {
    writes = operations;
    return { acknowledged: true };
  };

  try {
    await stats.recordMatch([
      {
        id: 'winner@c.us',
        name: 'Tripulante',
        role: 'DETECTIVE',
        tasksCompleted: 3
      },
      {
        id: 'impostor@c.us',
        name: 'Impostor',
        role: 'IMPOSTOR',
        tasksCompleted: 0
      }
    ], 'CREW');

    assert.equal(writes.length, 2);
    const winnerUpdate = writes[0].updateOne.update[0].$set;
    const impostorUpdate = writes[1].updateOne.update[0].$set;
    assert.equal(winnerUpdate.xp.$add[1], 115);
    assert.equal(winnerUpdate.seasonWins.$add[1], 1);
    assert.equal(impostorUpdate.xp.$add[1], 20);
    assert.equal(impostorUpdate.seasonWins.$add[1], 0);
    assert.ok(winnerUpdate.achievements.$setUnion[1].$concatArrays[0].includes('tres-tareas'));
    assert.deepEqual(
      writes.map(({ updateOne }) => updateOne.filter.userId),
      ['winner@c.us', 'impostor@c.us']
    );
  } finally {
    mongoose.connect = originalConnect;
    AmongChatProfile.bulkWrite = originalBulkWrite;
  }
});
