import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/Auth';
import { Login } from '../../components/Login';
import styles from './StartView.module.css';

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

export function StartView() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  function handlePlay() {
    if (status === 'authenticated') {
      navigate('/game');
      return;
    }
    setShowLogin(true);
  }

  function handleCredential(credential) {
    login(credential)
      .then(() => navigate('/game'))
      .catch((err) => console.error('Google sign-in failed', err));
  }

  return (
    <div className={styles.stage}>
      <div className={styles.backdropGlow} />
      <div className={styles.backdropGrid} />

      <svg className={styles.ekg} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <polyline
          className={styles.ekgLine}
          points="0,100 340,100 370,100 392,42 420,158 450,70 476,100 560,100 590,100 612,42 640,158 670,70 696,100 1200,100"
          fill="none"
          stroke="#A89E96"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2400"
          strokeDashoffset="2400"
        />
      </svg>

      <div className={styles.content}>
        <div className={styles.chip}>
          <span className={styles.chipDot} />
          Now Admitting
        </div>

        <h1 className={styles.title}>
          Patient
          <br />
          Please
        </h1>

        {showLogin && status !== 'authenticated' ? (
          <div className={styles.loginOverlay}>
            <Login googleClientId={GOOGLE_CLIENT_ID} onCredential={handleCredential} />
          </div>
        ) : (
          <div className={styles.buttonStage}>
            <span className={styles.ring} />
            <button type="button" className={styles.playButton} onClick={handlePlay}>
              <span className={styles.playIcon}>
                <svg width="0.62em" height="0.62em" viewBox="0 0 24 24" fill="#F2ECE7">
                  <path d="M5 3.5v17a1 1 0 0 0 1.53.85l13.2-8.5a1 1 0 0 0 0-1.7L6.53 2.65A1 1 0 0 0 5 3.5Z" />
                </svg>
              </span>
              PLAY
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
