const STORAGE_PREFIX = 'patientPlease.chat.';

function storageKey(gameSessionId, caseId) {
  return `${STORAGE_PREFIX}${gameSessionId}:${caseId}`;
}

/**
 * @param {string} gameSessionId
 * @param {string} caseId
 * @returns {Array<object>}
 */
export function loadChatMessages(gameSessionId, caseId) {
  try {
    const raw = window.localStorage.getItem(storageKey(gameSessionId, caseId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} gameSessionId
 * @param {string} caseId
 * @param {Array<object>} messages
 */
export function saveChatMessages(gameSessionId, caseId, messages) {
  try {
    window.localStorage.setItem(storageKey(gameSessionId, caseId), JSON.stringify(messages));
  } catch {
    // Storage unavailable/full — chat still works in-memory for this session.
  }
}

/**
 * Deletes every chat history this app has persisted to localStorage, across
 * all game sessions/cases, without touching unrelated localStorage entries.
 */
export function clearAllChatMessages() {
  const keysToRemove = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
