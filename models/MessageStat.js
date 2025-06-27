const mongoose = require('mongoose');

const MessageStatSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  userId: { type: String, required: true },
  messages: { type: Number, default: 1 },
  lastMessage: { type: Date, default: Date.now }
});

MessageStatSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageStat', MessageStatSchema);
