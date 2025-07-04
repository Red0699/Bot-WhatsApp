const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function getGeminiResponse(prompt) {
  const response = await axios.post(
    `${API_URL}?key=${GOOGLE_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GOOGLE_API_KEY  
      }
    }
  );

  const candidates = response.data.candidates;
  const result = candidates?.[0]?.content?.parts?.[0]?.text || '🤖 No recibí respuesta del modelo.';
  return result;
}

module.exports = {
  getGeminiResponse
};
