const text = require('../utils/whatsappText');

module.exports = {
  name: '!presentate',
  description: 'Sword Bot se presenta con estilo en el grupo.',
  category: 'Interacción',
  async execute(client, message) {
    const isGroup = message.from.endsWith('@g.us');

    const intro = [
      text.title('¡Hola!'),
      'Soy tu asistente para juegos y utilidades del grupo.',
      'Puedo ayudarte con adivinanzas, ahorcado y Piedra, Papel o Tijera.',
      text.hint('Escribe *!help* para ver todos los comandos disponibles.')
    ];

    if (isGroup) {
      intro.push('Me alegra estar aquí. ¡Vamos con toda! 💬');
    } else {
      intro.push('Puedes escribirme directamente cuando quieras.');
    }

    await message.reply(intro.join('\n\n'));
  }
};
