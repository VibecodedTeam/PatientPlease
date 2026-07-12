import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Phone.module.css';
import { useExaminations } from './providers/Examinations';

function countLabel(n) {
  if (n === 0) return 'Nie wybrano badań';
  const word = n === 1 ? 'badanie' : n < 5 ? 'badania' : 'badań';
  return `${n} ${word} wybrane`;
}

export function Phone({ onCancel }) {
  const { examinations, isLoading, error } = useExaminations();
  const [selected, setSelected] = useState({});
  const [ordered, setOrdered] = useState(false);

  function toggle(id) {
    const exam = examinations.find((e) => e.id === id);
    if (!exam || !exam.owned) return;
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function reset() {
    setSelected({});
    setOrdered(false);
  }

  const chosen = examinations.filter((e) => selected[e.id] && e.owned);
  const totalPrice = chosen.reduce((sum, e) => sum + e.price, 0);
  const confirmDisabled = chosen.length === 0;

  return (
    <div className={styles.phone}>
      <div className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

      {isLoading && <p className={styles.patientLine}>Ładowanie badań…</p>}
      {error && <p className={styles.patientLine}>Nie udało się wczytać listy badań.</p>}

      {!isLoading && !error && (ordered ? (
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4fbfa2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h4 className={styles.successTitle}>Badania zlecone</h4>
          <p className={styles.successText}>
            Skierowania trafiły do rejestracji. Łączny koszt: <strong>${totalPrice}</strong>.
          </p>

          <div className={styles.orderedList}>
            {chosen.map((e) => (
              <div className={styles.orderedRow} key={e.id}>
                <span className={styles.orderedName}>{e.name}</span>
                <span className={styles.orderedDuration}>${e.price}</span>
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
            {examinations.map((exam) => {
              const isSelected = !!selected[exam.id] && exam.owned;
              const unavailable = !exam.owned;
              return (
                <button
                  key={exam.id}
                  type="button"
                  className={`${styles.row}${isSelected ? ` ${styles.rowSelected}` : ''}${unavailable ? ` ${styles.rowUnavailable}` : ''}`}
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  onClick={() => toggle(exam.id)}
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
                      <span className={`${styles.rowName}${unavailable ? ` ${styles.rowNameUnavailable}` : ''}`}>{exam.name}</span>
                      {unavailable && <span className={styles.unavailableBadge}>Niedostępne</span>}
                    </span>
                    <span className={`${styles.rowDesc}${unavailable ? ` ${styles.rowDescUnavailable}` : ''}`}>{exam.description}</span>
                  </span>
                  <span className={`${styles.rowDuration}${unavailable ? ` ${styles.rowDurationUnavailable}` : ''}`}>
                    ${exam.price}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <div className={styles.summary}>
              <div>
                <div className={styles.summaryLabel}>Łączny koszt badań</div>
                <div className={styles.summaryCount}>{countLabel(chosen.length)}</div>
              </div>
              <div className={styles.summaryTotal} data-testid="examinations-total-price">${totalPrice}</div>
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
      ))}
    </div>
  );
}

Phone.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
