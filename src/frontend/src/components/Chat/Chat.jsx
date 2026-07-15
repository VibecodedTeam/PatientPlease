import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';
import { useApi } from '../../providers/Api';
import { useRound } from '../../providers/Round';
import { loadChatMessages, saveChatMessages, clearAllChatMessages } from './internal/chatStorage';

/**
 * @param {{ gameSessionId: string, caseId: string }} props
 */
export function Chat({ gameSessionId, caseId }) {
  const api = useApi();
  const { round, revealDocuments } = useRound();
  const portraitImageUrl = round?.case?.patient?.portraitImageUrl;
  const [messages, setMessages] = useState(() => loadChatMessages(gameSessionId, caseId));
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  // gameSessionId/caseId can arrive after Chat's first mount (the parent view
  // still awaiting round data) — the useState initializer above only runs
  // once, so re-load explicitly whenever the real ids become available.
  useEffect(() => {
    setMessages(loadChatMessages(gameSessionId, caseId));
  }, [gameSessionId, caseId]);

  useEffect(() => {
    saveChatMessages(gameSessionId, caseId, messages);
  }, [gameSessionId, caseId, messages]);

  function clearHistory() {
    clearAllChatMessages();
    setMessages([]);
  }

  async function sendDoctorReply() {
    const text = draft.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setError(null);
    setDraft('');

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { id: pendingId, sender: 'PLAYER', content: text }]);

    const formData = new FormData();
    formData.append('gameSessionId', gameSessionId);
    formData.append('caseId', caseId);
    formData.append('text', text);

    try {
      const data = await api.post('/api/v1/chat', formData, {
        headers: { 'Content-Type': undefined },
      });
      setMessages((prev) => [...prev.filter((message) => message.id !== pendingId), ...data.chatMessages]);
      revealDocuments(data.revealedDocuments);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Chat: POST /api/v1/chat failed', {
        status: err?.response?.status,
        body: err?.response?.data,
        message: err?.message,
        error: err,
      });
      setMessages((prev) => prev.filter((message) => message.id !== pendingId));
      setDraft(text);
      setError('Could not send message. Try again.');
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendDoctorReply();
    }
  }

  return (
    <aside className={styles.chat} aria-label="Patient chat panel">
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Patient Chart</h1>
        <button type="button" className={styles.clearButton} onClick={clearHistory}>
          Clear history
        </button>
      </header>

      <section className={styles.face}>
        {portraitImageUrl && (
          <img className={styles.portrait} alt="Patient portrait" src={portraitImageUrl} />
        )}
      </section>

      <div className={styles.log} role="log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.msg} ${message.sender === 'PATIENT' ? styles.msgPatient : styles.msgDoctor}`}
          >
            <span className={styles.who}>{message.sender === 'PATIENT' ? 'Patient' : 'Doctor'}</span>
            {message.content}
          </div>
        ))}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          aria-label="Doctor reply"
          placeholder="Ask the patient a question…"
          value={draft}
          disabled={isSending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={styles.sendButton}
          disabled={isSending}
          onClick={sendDoctorReply}
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </aside>
  );
}

Chat.propTypes = {
  gameSessionId: PropTypes.string.isRequired,
  caseId: PropTypes.string.isRequired,
};
