import React from 'react';
import PropTypes from 'prop-types';
import styles from './Phone.module.css';
import { useExaminations } from './providers/Examinations';
import { useRound } from '../../providers/Round';

export function Phone({ onCancel }) {
  const { examinations, isLoading, error, order, orderingId, orderError } = useExaminations();
  const { round } = useRound();
  const patient = round?.case?.patient;

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
          <h3 className={styles.title}>Order laboratory tests</h3>
          {patient && (
            <p className={styles.patientLine}>
              Patient: <strong>{patient.name}</strong> · {patient.age}
            </p>
          )}
        </div>
        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onCancel}>
          ✕
        </button>
      </div>

      {isLoading && <p className={styles.patientLine}>Loading examinations…</p>}
      {error && <p className={styles.patientLine}>Could not load the examinations list.</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.testList}>
            {examinations.map((exam) => {
              const unavailable = !exam.owned;
              const isOrdering = orderingId === exam.id;
              return (
                <div
                  key={exam.id}
                  className={`${styles.row}${unavailable ? ` ${styles.rowUnavailable}` : ''}`}
                >
                  <span className={styles.rowBody}>
                    <span className={styles.rowNameLine}>
                      <span className={`${styles.rowName}${unavailable ? ` ${styles.rowNameUnavailable}` : ''}`}>
                        {exam.name}
                      </span>
                      {unavailable && <span className={styles.unavailableBadge}>Unavailable</span>}
                    </span>
                    <span className={`${styles.rowDesc}${unavailable ? ` ${styles.rowDescUnavailable}` : ''}`}>
                      {exam.description}
                    </span>
                    {unavailable ? (
                      <span className={styles.rowHint}>Buy at the night shop to unlock</span>
                    ) : (
                      <span className={styles.rowPrice}>${exam.price}</span>
                    )}
                  </span>

                  <span className={styles.rowActions}>
                    {!unavailable && (
                      <span className={styles.rowDuration}>
                        +{Math.round(exam.timeCostMs / 1000)}s
                      </span>
                    )}
                    {!unavailable && (
                      <button
                        type="button"
                        className={styles.orderButton}
                        disabled={isOrdering}
                        onClick={() => order(exam.id)}
                      >
                        {isOrdering ? 'Ordering…' : 'Order'}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {orderError && (
            <p className={styles.errorText}>Could not order this test. It may already be ordered.</p>
          )}
        </>
      )}
    </div>
  );
}

Phone.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
