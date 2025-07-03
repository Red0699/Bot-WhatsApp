const palabras = require('./ahorcadoPalabras');

const juegos = {};

function normalizar(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function iniciarJuego(chatId) {
    const palabraReal = palabras[Math.floor(Math.random() * palabras.length)].toLowerCase();

    const oculto = palabraReal.split('').map(c => (c === ' ' ? ' ' : '_'));

    const intentos = Math.max(6, Math.ceil(palabraReal.replace(/\s/g, '').length * 0.4));

    juegos[chatId] = {
        palabra: palabraReal,
        oculto,
        intentos,
        letrasUsadas: []
    };

    return juegos[chatId];
}

function adivinarLetra(chatId, letra) {
    const juego = juegos[chatId];
    if (!juego) return null;

    letra = normalizar(letra.toLowerCase());
    if (juego.letrasUsadas.includes(letra)) return 'usada';

    juego.letrasUsadas.push(letra);

    let acierto = false;

    for (let i = 0; i < juego.palabra.length; i++) {
        const letraReal = juego.palabra[i];
        const letraNormalizada = normalizar(letraReal);

        if (letraNormalizada === letra) {
            juego.oculto[i] = letraReal; // conserva la tilde al mostrar
            acierto = true;
        }
    }

    if (acierto) {
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
