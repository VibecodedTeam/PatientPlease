import React, { createContext, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const BiopsyMinigameContext = createContext(null);

const RESULT_MESSAGE_TYPE = 'biopsy-minigame-result';
const LAB_DISASTER_SCORE_THRESHOLD = 30;

/**
 * Receives the excision-biopsy minigame's result from the separate browser
 * tab Phone opens for the Punch Biopsy examination (see components/Phone and
 * views/MinigameView) via `postMessage`, and decides what the player sees for
 * it. Ordering this exam never goes through GameSession's addElapsedSeconds
 * the way other examinations do (see ExaminationsProvider.order) — this tab's
 * own day timer never stopped running while the minigame tab was open, so no
 * artificial time bump is needed. The real examination is only submitted
 * (Round's orderExamination) once the player finishes with a passing score; a
 * failed attempt costs nothing, so Phone can be used to try again.
 */
export function BiopsyMinigameProvider({ children }) {
  const { round, orderExamination, refreshRound } = useRound();
  const [isLabDisasterOpen, setIsLabDisasterOpen] = useState(false);

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== RESULT_MESSAGE_TYPE) return;
      const { shopItemId, caseId, score } = event.data;
      // A stale/late result for a case that's no longer active (e.g. the
      // player finished the current case and moved on while the minigame tab
      // was still open) is ignored rather than misapplied to the new case.
      if (caseId !== round?.case?.id) return;

      if (score < LAB_DISASTER_SCORE_THRESHOLD) {
        setIsLabDisasterOpen(true);
        return;
      }
      // Tolerates an "already ordered" rejection (e.g. two minigame tabs
      // finishing in quick succession) the same way ExaminationsProvider.order
      // already does — there's no UI surface here to show that error on.
      orderExamination(caseId, shopItemId)
        .then(() => refreshRound())
        .catch(() => {});
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [round, orderExamination, refreshRound]);

  const closeLabDisaster = useCallback(() => {
    setIsLabDisasterOpen(false);
  }, []);

  const value = { isLabDisasterOpen, closeLabDisaster };

  return <BiopsyMinigameContext.Provider value={value}>{children}</BiopsyMinigameContext.Provider>;
}

BiopsyMinigameProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
