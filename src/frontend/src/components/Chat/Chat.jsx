import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';
import { useApi } from '../../providers/Api';
import { useRound } from '../../providers/Round';
import { loadChatMessages, saveChatMessages, clearAllChatMessages } from './internal/chatStorage';

const PORTRAIT_FILES = [
  '001_45-year-old-male-stern-square-jaw-recedi_20260709-152719.png',
  '002_elderly-woman-soft-round-face-smile-line_20260709-152810.png',
  '003_45-year-old-male-square-jaw-with-light-s_20260709-152832.png',
  '004_middle-aged-female-sharp-cheekbones-hook_20260709-152854.png',
  '005_middle-aged-male-strong-jawline-and-slig_20260709-152914.png',
  '006_elderly-male-wrinkled-forehead-and-bushy_20260709-152928.png',
  '007_elderly-female-high-cheekbones-and-thin-_20260709-152944.png',
  '008_80-year-old-woman-high-cheekbones-thin-l_20260709-153010.png',
  '009_45-year-old-male-strong-jawline-faint-cr_20260709-153107.png',
  '010_middle-aged-female-rounded-cheeks-should_20260709-153146.png',
];

function pickRandomPortrait() {
  return PORTRAIT_FILES[Math.floor(Math.random() * PORTRAIT_FILES.length)];
}

/**
 * @param {{ gameSessionId: string, caseId: string }} props
 */
export function Chat({ gameSessionId, caseId }) {
  const api = useApi();
  const { round, revealDocuments } = useRound();
  const [fallbackPortrait] = useState(pickRandomPortrait);
  // Prefer the active case's seeded portrait; fall back to a stable random one
  // while the round payload is still loading (or lacks a portrait).
  const portraitSrc =
    round?.case?.patient?.portraitImageUrl ?? `/patient-portraits/${fallbackPortrait}`;
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
        <img className={styles.portrait} alt="Patient portrait" src={portraitSrc} />
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
