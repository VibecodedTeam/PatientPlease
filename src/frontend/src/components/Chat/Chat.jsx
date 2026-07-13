import React, { useState } from 'react';
import styles from './Chat.module.css';

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

const OPENING_LINE = "Good morning... I've come in because since yesterday there's been a pressure in my chest.";

const CANNED_REPLIES = [
  'This chest pain started yesterday evening, doctor…',
  "I'm a bit short of breath, especially climbing stairs.",
  "I only take my blood pressure medication, nothing else.",
  "No, I haven't smoked in ten years. But I used to smoke a pack a day.",
  'My father died of a heart attack at my age… I worry it might be the same.',
];

function pickRandomPortrait() {
  return PORTRAIT_FILES[Math.floor(Math.random() * PORTRAIT_FILES.length)];
}

export function Chat() {
  const [portrait] = useState(pickRandomPortrait);
  const [messages, setMessages] = useState([{ from: 'patient', text: OPENING_LINE }]);
  const [replyIndex, setReplyIndex] = useState(0);
  const [draft, setDraft] = useState('');

  function sendDoctorReply() {
    const text = draft.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { from: 'doctor', text },
      { from: 'patient', text: CANNED_REPLIES[replyIndex % CANNED_REPLIES.length] },
    ]);
    setReplyIndex((i) => i + 1);
    setDraft('');
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
      </header>

      <section className={styles.face}>
        <img
          className={styles.portrait}
          alt="Patient portrait"
          src={`/patient-portraits/${portrait}`}
        />
      </section>

      <div className={styles.log} role="log" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.msg} ${message.from === 'patient' ? styles.msgPatient : styles.msgDoctor}`}
          >
            <span className={styles.who}>{message.from === 'patient' ? 'Patient' : 'Doctor'}</span>
            {message.text}
          </div>
        ))}
      </div>

      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          aria-label="Doctor reply"
          placeholder="Ask the patient a question…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className={styles.sendButton} onClick={sendDoctorReply}>
          Send
        </button>
      </div>
    </aside>
  );
}
