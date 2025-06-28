// utils/ahorcadoManager.js

const palabras = require('./ahorcadoPalabras');

const juegos = {}; // clave: chatId

function iniciarJuego(chatId) {
    const palabra = palabras[Math.floor(Math.random() * palabras.length)].toLowerCase();
    const oculto = '_'.repeat(palabra.length).split('');
    juegos[chatId] = {
        palabra,
        oculto,
        intentos: 6,
        letrasUsadas: []
    };
    return juegos[chatId];
}

function adivinarLetra(chatId, letra) {
    const juego = juegos[chatId];
    if (!juego) return null;

    letra = letra.toLowerCase();
    if (juego.letrasUsadas.includes(letra)) return 'usada';

    juego.letrasUsadas.push(letra);

    if (juego.palabra.includes(letra)) {
        for (let i = 0; i < juego.palabra.length; i++) {
            if (juego.palabra[i] === letra) juego.oculto[i] = letra;
        }
        return juego.oculto.join('') === juego.palabra ? 'ganaste' : 'acierto';
    } else {
        juego.intentos--;
        return juego.intentos <= 0 ? 'perdiste' : 'fallo';
    }
}

function estadoJuego(chatId) {
    const juego = juegos[chatId];
    if (!juego) return null;

    return {
        palabra: juego.oculto.join(' '),
        palabraReal: juego.palabra,
        intentos: juego.intentos,
        letrasUsadas: juego.letrasUsadas
    };
}

function finalizarJuego(chatId) {
    delete juegos[chatId];
}

module.exports = {
    iniciarJuego,
    adivinarLetra,
    estadoJuego,
    finalizarJuego
};
