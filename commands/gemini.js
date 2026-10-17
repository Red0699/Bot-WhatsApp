const { getGeminiResponse } = require('../services/geminiService');

module.exports = {
  name: '!gemini',
  description: 'Envía un mensaje a Google Gemini y devuelve la respuesta',
  category: 'Servicios',
  async execute(client, message) {
    const body = message.body.trim();
    const args = body.split(' ').slice(1);
    const prompt = args.join(' ');

    if (!prompt) {
      return message.reply('❗ Por favor, escribe algo. Ejemplo: !gemini ¿Qué es el calentamiento global?');
    }

    try {
      const response = await getGeminiResponse(prompt);
      await message.reply(response);
    } catch (error) {
      const details = error.response?.data?.error?.message || error.message;
      console.error('Error al consultar Gemini:', details);
      await message.reply('⚠️ Ocurrió un error al consultar Google Gemini.');
    }
  }
};
