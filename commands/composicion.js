const heroes = require('../utils/heroesData');

module.exports = {
  name: '!composicion',
  description: 'Genera una composición aleatoria con 5 héroes y líneas asignadas al azar.',
  category: 'Juegos',
  async execute(client, message) {
    const lineas = ['Gold Lane', 'EXP Lane', 'Mid Lane', 'Jungle', 'Roam'];

    if (heroes.length < 5) {
      return message.reply('❌ No hay suficientes héroes para formar una composición.');
    }

    // Función para barajar aleatoriamente
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const heroesAleatorios = shuffle([...heroes]).slice(0, 5);
    const composicion = lineas.map((linea, index) => ({
      linea,
      heroe: heroesAleatorios[index].nombre
    }));

    let respuesta = '🛡 *Composición de equipo generada al azar:*\n\n';
    composicion.forEach(pick => {
      respuesta += `• *${pick.linea}*: ${pick.heroe}\n`;
    });

    await message.reply(respuesta);
  }
};
