import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Excisio } from '../../components/Excisio';

const RESULT_MESSAGE_TYPE = 'biopsy-minigame-result';

/**
 * Full-screen route for the excision-biopsy minigame, reached at
 * /game/main/minigame in a NEW browser tab opened by Phone's Punch Biopsy
 * Order button (see components/Phone) — deliberately a separate tab, not an
 * in-app navigation, so the day timer and the rest of MainView keep running
 * completely untouched in the original tab while this one plays out. No day
 * timer or Settings render here; this tab's only job is to run Excisio and
 * report the result back to whichever tab opened it (see
 * views/MainView/providers/BiopsyMinigame, which listens for it).
 */
export function MinigameView() {
  const [searchParams] = useSearchParams();
  const shopItemId = searchParams.get('shopItemId');
  const caseId = searchParams.get('caseId');

  function handleComplete(score) {
    if (window.opener) {
      window.opener.postMessage(
        { type: RESULT_MESSAGE_TYPE, shopItemId, caseId, score },
        window.location.origin,
      );
    }
    window.close();
  }

  return <Excisio onComplete={handleComplete} />;
}
