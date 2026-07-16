import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { useRound } from '../../../../../providers/Round';
import {
  BiopsyMinigameProvider,
  useBiopsyMinigame,
} from '../../../../../views/MainView/providers/BiopsyMinigame';

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1' }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function Probe() {
  const { isLabDisasterOpen, closeLabDisaster } = useBiopsyMinigame();
  const { round } = useRound();
  return (
    <div>
      <span data-testid="lab-disaster">{String(isLabDisasterOpen)}</span>
      <span data-testid="case-id">{round?.case?.id ?? 'loading'}</span>
      <button onClick={closeLabDisaster}>close</button>
    </div>
  );
}

function postResult(payload, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { origin, data: payload }));
  });
}

function mockRoundAndExamFetch(examinationResponseFactory) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    }
    if (pathname === '/api/v1/examinations') {
      return examinationResponseFactory(request);
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <BiopsyMinigameProvider>
          <Probe />
        </BiopsyMinigameProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('BiopsyMinigameProvider', () => {
  it('opens the lab disaster flag on a score below 30, without calling the examinations endpoint', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-1'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 10 });

    expect(screen.getByTestId('lab-disaster').textContent).toBe('true');
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeUndefined();
  });

  it('orders the examination on a score of 30 or above, without opening the lab disaster flag', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ gameSession: {}, caseExamination: { id: 'ce1' } }), {
          status: 200,
        }),
      ),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-1'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 80 });

    await waitFor(() => {
      const examinationRequest = global.fetch.mock.calls
        .map(([request]) => request)
        .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
      expect(examinationRequest).toBeDefined();
    });
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(await examinationRequest.clone().json()).toEqual({ caseId: 'case-1', shopItemId: 'exam-1' });
    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('ignores a result for a case that is no longer the active one', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-1'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'some-other-case', score: 5 });

    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('ignores messages from another origin', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-1'));

    postResult(
      { type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 5 },
      'https://evil.example.com',
    );

    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('closeLabDisaster resets the flag', async () => {
    const user = userEvent.setup();
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-1'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 10 });
    expect(screen.getByTestId('lab-disaster').textContent).toBe('true');

    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });
});
