import { loadChatMessages, saveChatMessages, clearAllChatMessages } from '../../../../components/Chat/internal/chatStorage';

describe('chatStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty array when nothing is stored for a session/case pair', () => {
    expect(loadChatMessages('s1', 'c1')).toEqual([]);
  });

  it('round-trips saved messages for a given session/case pair', () => {
    const messages = [{ id: 'm1', sender: 'PLAYER', content: 'Hi', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 }];
    saveChatMessages('s1', 'c1', messages);
    expect(loadChatMessages('s1', 'c1')).toEqual(messages);
  });

  it('keeps different session/case pairs isolated', () => {
    saveChatMessages('s1', 'c1', [{ id: 'a' }]);
    saveChatMessages('s2', 'c2', [{ id: 'b' }]);

    expect(loadChatMessages('s1', 'c1')).toEqual([{ id: 'a' }]);
    expect(loadChatMessages('s2', 'c2')).toEqual([{ id: 'b' }]);
  });

  it('clearAllChatMessages removes every stored chat but leaves unrelated storage alone', () => {
    saveChatMessages('s1', 'c1', [{ id: 'a' }]);
    saveChatMessages('s2', 'c2', [{ id: 'b' }]);
    window.localStorage.setItem('unrelated-key', 'keep-me');

    clearAllChatMessages();

    expect(loadChatMessages('s1', 'c1')).toEqual([]);
    expect(loadChatMessages('s2', 'c2')).toEqual([]);
    expect(window.localStorage.getItem('unrelated-key')).toBe('keep-me');
  });
});
