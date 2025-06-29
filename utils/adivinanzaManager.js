const adivinanzas = require('./adivinanzasColombianas');

const juegos = {}; // clave: chatId

function iniciarAdivinanza(chatId) {
  const aleatoria = adivinanzas[Math.floor(Math.random() * adivinanzas.length)];
  juegos[chatId] = {
    pista: aleatoria.pista,
    respuesta: aleatoria.respuesta.toLowerCase()
  };
  return juegos[chatId];
}

function verificarRespuesta(chatId, intento) {
  const juego = juegos[chatId];
  if (!juego) return null;

  if (intento.toLowerCase() === juego.respuesta) {
    delete juegos[chatId];
    return true;
  }
  return false;
}

function obtenerPista(chatId) {
  return juegos[chatId]?.pista || null;
}

function juegoActivo(chatId) {
  return !!juegos[chatId];
}

module.exports = {
  iniciarAdivinanza,
  verificarRespuesta,
  obtenerPista,
  juegoActivo
};
