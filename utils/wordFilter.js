const palabrasProhibidas = require('./palabrasClave');

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function detectarPalabraProhibida(texto) {
  const textoNormalizado = ` ${normalizarTexto(texto)} `;

  return palabrasProhibidas.find((palabra) =>
    textoNormalizado.includes(` ${normalizarTexto(palabra)} `)
  );
}

module.exports = { detectarPalabraProhibida, normalizarTexto };
