const normalizeProtocol = (value) => String(value || '').trim().toLowerCase();
const normalizeSortName = (indexer = {}) => String(indexer.sortName || indexer.name || '').toLowerCase();

const protocolBucketOrder = {
  usenet: 0,
  torrent: 1,
};

export function getProtocolPreferenceState(indexers = []) {
  const enabledIndexers = indexers.filter((indexer) => indexer?.enable);
  const enabledProtocols = ['usenet', 'torrent']
    .map((protocol) => ({
      protocol,
      topPriority: Math.max(
        ...enabledIndexers
          .filter((indexer) => normalizeProtocol(indexer.protocol) === protocol)
          .map((indexer) => Number(indexer.priority || 0)),
        0,
      ),
    }))
    .filter((entry) => entry.topPriority > 0)
    .sort((left, right) => right.topPriority - left.topPriority);

  if (!enabledProtocols.length) {
    return {
      preferredProtocol: null,
      label: 'No protocol preference detected',
    };
  }

  const preferredProtocol = enabledProtocols[0].protocol;
  return {
    preferredProtocol,
    label: preferredProtocol === 'usenet' ? 'Usenet preferred' : 'Torrent preferred',
  };
}

export function buildProtocolPreferencePriorityUpdates(indexers = [], preferredProtocol = 'usenet') {
  const preferred = normalizeProtocol(preferredProtocol);
  const enabledIndexers = indexers.filter((indexer) => indexer?.enable);

  const preferredIndexers = enabledIndexers
    .filter((indexer) => normalizeProtocol(indexer.protocol) === preferred)
    .sort((left, right) => normalizeSortName(left).localeCompare(normalizeSortName(right)));

  const otherIndexers = enabledIndexers
    .filter((indexer) => normalizeProtocol(indexer.protocol) !== preferred)
    .sort((left, right) => {
      const leftProtocol = normalizeProtocol(left.protocol);
      const rightProtocol = normalizeProtocol(right.protocol);
      const leftBucket = protocolBucketOrder[leftProtocol] ?? 10;
      const rightBucket = protocolBucketOrder[rightProtocol] ?? 10;

      if (leftBucket !== rightBucket) {
        return leftBucket - rightBucket;
      }

      return normalizeSortName(left).localeCompare(normalizeSortName(right));
    });

  return [
    ...preferredIndexers.map((indexer, index) => ({ ...indexer, priority: Math.max(1, 50 - index) })),
    ...otherIndexers.map((indexer, index) => ({ ...indexer, priority: Math.max(1, 25 - index) })),
  ];
}
