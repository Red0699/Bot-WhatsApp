module.exports = {
  name: '!presentate',
  description: 'Sword Bot se presenta con estilo en el grupo.',
  category: 'Interacción',
  async execute(client, message) {
    const isGroup = message.from.endsWith('@g.us');

    let intro = '⚔️ *Hola a todos!*\n\n';
    intro += 'Soy *Sword Bot*, un bot creado para ayudarte a interactuar y aprender.\n';
    intro += 'Estoy listo para acompañarte en este grupo con comandos útiles y un toque de diversión. 🤖✨\n\n';
    intro += 'Escribe `!help` para ver lo que puedo hacer.';

    if (isGroup) {
      intro += '\n\nMe alegra estar aquí. ¡Vamos con toda! 💬';
    } else {
      intro += `\n\n¡Puedes escribirme directamente cuando quieras!`;
    }

    await message.reply(intro);
  }
};
