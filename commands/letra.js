// commands/letra.js

const { adivinarLetra, estadoJuego, finalizarJuego } = require('../utils/ahorcadoManager');

module.exports = {
  name: '!letra',
  description: 'Adivina una letra del ahorcado. Ej: !letra a',
  category: 'Comandos para jugar',
  async execute(client, message) {
    const chat = await message.getChat();
    const args = message.body.trim().split(' ');
    const letra = args[1]?.toLowerCase();

    if (!letra || letra.length !== 1) {
      return message.reply('⚠️ Debes enviar una sola letra. Ej: !letra a');
    }

    const resultado = adivinarLetra(chat.id._serialized, letra);
    if (!resultado) return message.reply('❌ No hay un juego en curso. Usa !ahorcado');

    const estado = estadoJuego(chat.id._serialized);

    if (resultado === 'usada') {
      return message.reply(`⚠️ Ya usaste la letra *${letra}*. Intenta otra.`);
    }

    if (resultado === 'acierto') {
      return message.reply(`✅ ¡Bien! Letra correcta.\n🔤 ${estado.palabra}\n❤️ Intentos: ${estado.intentos}`);
    }

    if (resultado === 'fallo') {
      return message.reply(`❌ Letra incorrecta.\n🔤 ${estado.palabra}\n❤️ Intentos: ${estado.intentos}`);
    }

    if (resultado === 'ganaste') {
      finalizarJuego(chat.id._serialized);
      return message.reply(`🏆 ¡Felicidades! Adivinaste la palabra: *${estado.palabra.replace(/ /g, '')}*`);
    }

    if (resultado === 'perdiste') {
      finalizarJuego(chat.id._serialized);
      return message.reply(`💀 ¡Perdiste! La palabra era: *${estado.palabraReal}*`);
    }
  }
};
