function getGroupId(notification) {
  const remote = notification.id?.remote || notification._data?.id?.remote;
  const remoteId = typeof remote === 'string'
    ? remote
    : remote?._serialized || remote?.toString?.();
  const groupId = notification.chatId || remoteId;

  return typeof groupId === 'string' && groupId.endsWith('@g.us')
    ? groupId
    : undefined;
}

module.exports = { getGroupId };
