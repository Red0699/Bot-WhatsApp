function title(text) {
  return `⚔️ *Sword Bot*\n*${text}*`;
}

function error(text) {
  return `⚠️ ${text}`;
}

function hint(text) {
  return `💡 ${text}`;
}

module.exports = { title, error, hint };
