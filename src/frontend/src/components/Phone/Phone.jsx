import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Phone.module.css';

const TESTS = [
  { id: 'derm', name: 'Dermatoskopia cyfrowa', desc: 'Cyfrowe mapowanie i archiwizacja znamion', minutes: 15, available: true },
  { id: 'biopsy', name: 'Biopsja zmiany skórnej', desc: 'Pobranie wycinka do oceny mikroskopowej', minutes: 60, available: true },
  { id: 'blood', name: 'Badania krwi', desc: 'Morfologia, LDH i markery nowotworowe S100', minutes: 20, available: true },
  { id: 'usg', name: 'USG węzłów chłonnych', desc: 'Ocena regionalnych węzłów wartowniczych', minutes: 30, available: true },
  { id: 'histo', name: 'Badanie histopatologiczne', desc: 'Wymaga materiału pobranego podczas biopsji', minutes: 0, available: false },
  { id: 'onko', name: 'Konsultacja onkologiczna', desc: 'Brak wolnych terminów w tym tygodniu', minutes: 45, available: false },
];

function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let text = '';
  if (hours) text += `${hours} godz`;
  if (minutes) text += `${text ? ' ' : ''}${minutes} min`;
  return text;
}

function countLabel(n) {
  if (n === 0) return 'Nie wybrano badań';
  const word = n === 1 ? 'badanie' : n < 5 ? 'badania' : 'badań';
  return `${n} ${word} wybrane`;
}

export function Phone({ onCancel }) {
  const [selected, setSelected] = useState({});
  const [ordered, setOrdered] = useState(false);

  function toggle(id) {
    const test = TESTS.find((t) => t.id === id);
    if (!test || !test.available) return;
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function reset() {
    setSelected({});
    setOrdered(false);
  }

  const chosen = TESTS.filter((t) => selected[t.id] && t.available);
  const totalMinutes = chosen.reduce((sum, t) => sum + t.minutes, 0);
  const confirmDisabled = chosen.length === 0;

  return (
    <div className={styles.phone}>
      <div className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d98a80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
            <circle cx="11" cy="11" r="2.6" />
          </svg>
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>Zleć badania</h3>
          <p className={styles.patientLine}>
            Pacjent: <strong>Anna Kowalska</strong> · 47 l. · podejrzenie czerniaka (zmiana ok. plec.)
          </p>
        </div>
        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onCancel}>
          ✕
        </button>
      </div>

      {ordered ? (
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4fbfa2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h4 className={styles.successTitle}>Badania zlecone</h4>
          <p className={styles.successText}>
            Skierowania trafiły do rejestracji. Szacowany łączny czas w placówce:{' '}
            <strong>{formatMinutes(totalMinutes) || '0 min'}</strong>.
          </p>

          <div className={styles.orderedList}>
            {chosen.map((t) => (
              <div className={styles.orderedRow} key={t.id}>
                <span className={styles.orderedName}>{t.name}</span>
                <span className={styles.orderedDuration}>{formatMinutes(t.minutes)}</span>
              </div>
            ))}
          </div>

          <div className={styles.successActions}>
            <button type="button" className={styles.resetButton} onClick={reset}>
              Zleć kolejne
            </button>
            <button type="button" className={styles.doneButton} onClick={onCancel}>
              Zamknij
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.testList}>
            {TESTS.map((test) => {
              const isSelected = !!selected[test.id] && test.available;
              const unavailable = !test.available;
              return (
                <button
                  key={test.id}
                  type="button"
                  className={`${styles.row}${isSelected ? ` ${styles.rowSelected}` : ''}${unavailable ? ` ${styles.rowUnavailable}` : ''}`}
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  onClick={() => toggle(test.id)}
                >
                  <span className={`${styles.rowBox}${isSelected ? ` ${styles.rowBoxSelected}` : ''}`} aria-hidden="true">
                    {isSelected && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ece8e3" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowNameLine}>
                      <span className={`${styles.rowName}${unavailable ? ` ${styles.rowNameUnavailable}` : ''}`}>{test.name}</span>
                      {unavailable && <span className={styles.unavailableBadge}>Niedostępne</span>}
                    </span>
                    <span className={`${styles.rowDesc}${unavailable ? ` ${styles.rowDescUnavailable}` : ''}`}>{test.desc}</span>
                  </span>
                  <span className={`${styles.rowDuration}${unavailable ? ` ${styles.rowDurationUnavailable}` : ''}`}>
                    {formatMinutes(test.minutes) || (unavailable ? '—' : '')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <div className={styles.summary}>
              <div>
                <div className={styles.summaryLabel}>Łączny czas badań</div>
                <div className={styles.summaryCount}>{countLabel(chosen.length)}</div>
              </div>
              <div className={styles.summaryTotal}>{formatMinutes(totalMinutes) || '0 min'}</div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onCancel}>
                Anuluj
              </button>
              <button type="button" className={styles.confirmButton} disabled={confirmDisabled} onClick={() => setOrdered(true)}>
                {confirmDisabled ? 'Zleć badania' : `Zleć badania (${chosen.length})`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Phone.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
