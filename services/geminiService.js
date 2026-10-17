const axios = require('axios');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

async function getGeminiResponse(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Falta configurar GOOGLE_API_KEY en el archivo .env.');
  }

  const response = await axios.post(API_URL, {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    }
  });

  const candidates = response.data.candidates;
  const result = candidates?.[0]?.content?.parts?.[0]?.text || '🤖 No recibí respuesta del modelo.';
  return result;
}

module.exports = {
  getGeminiResponse
};
