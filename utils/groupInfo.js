async function getGroupInfo(client, chatId) {
  let chatError;

  try {
    const chat = await client.getChatById(chatId);
    if (chat) {
      return {
        name: chat.name,
        participantCount: Array.isArray(chat.participants) ? chat.participants.length : 0
      };
    }

    chatError = new Error(`No se encontró el grupo ${chatId}.`);
  } catch (error) {
    chatError = error;
  }

  if (typeof client.pupPage?.evaluate !== 'function') {
    throw chatError;
  }

  const cachedInfo = await client.pupPage.evaluate(async id => {
    const chat = await window.WWebJS.getChat(id, { getAsModel: false });
    if (!chat?.groupMetadata) return null;

    const participants = chat.groupMetadata.participants?.serialize?.() || [];
    return {
      name: chat.formattedTitle || chat.name,
      participantCount: participants.length
    };
  }, chatId);

  if (!cachedInfo) throw chatError;
  return cachedInfo;
}

module.exports = { getGroupInfo };
