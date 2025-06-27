const matches = {};

function startMatch(grupoId, player1, player2) {
  matches[grupoId] = {
    players: [player1, player2],
    moves: {},
    grupoId // 👈 importante
  };
}

function submitMove(grupoId, player, move) {
  if (!matches[grupoId]) return null;

  matches[grupoId].moves[player] = move;

  if (Object.keys(matches[grupoId].moves).length === 2) {
    return matches[grupoId]; // ambos jugaron
  }

  return null; // falta uno
}

function getMatchByPlayer(player) {
  return Object.entries(matches).find(([_, match]) =>
    match.players.includes(player)
  );
}

function deleteMatch(grupoId) {
  delete matches[grupoId];
}

module.exports = {
  startMatch,
  submitMove,
  getMatch: (id) => matches[id],
  getMatchByPlayer,
  deleteMatch
};

// Este módulo maneja las partidas de Piedra, Papel o Tijera.
// Permite iniciar una partida, enviar jugadas y determinar el ganador.