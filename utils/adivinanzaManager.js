const adivinanzas = require('./adivinanzasColombianas');

const juegos = {}; // clave: chatId

function iniciarAdivinanza(chatId) {
  const aleatoria = adivinanzas[Math.floor(Math.random() * adivinanzas.length)];
  juegos[chatId] = {
    pistas: Array.isArray(aleatoria.pista) ? aleatoria.pista : [aleatoria.pista],
    respuesta: aleatoria.respuesta.toLowerCase(),
    pistaActual: 0
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
  const juego = juegos[chatId];
  if (!juego) return null;

  // Si solo hay una pista, no hay más para mostrar
  if (juego.pistas.length === 1) return null;

  // Si ya mostró todas las pistas disponibles
  if (juego.pistaActual >= juego.pistas.length - 1) {
    return null;
  }

  
  juego.pistaActual++;
  return juego.pistas[juego.pistaActual];
}


function obtenerRespuesta(chatId) {
  const juego = juegos[chatId];
  if (!juego) return null;

  const respuesta = juego.respuesta;
  delete juegos[chatId];
  return respuesta;
}

function juegoActivo(chatId) {
  return !!juegos[chatId];
}

module.exports = {
  iniciarAdivinanza,
  verificarRespuesta,
  obtenerPista,
  obtenerRespuesta,
  juegoActivo
};
