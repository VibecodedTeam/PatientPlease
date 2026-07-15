import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider, useRound } from '../../../providers/Round';
import { Chat } from '../../../components/Chat';

function renderChat(props = {}) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <Chat gameSessionId="session-1" caseId="case-1" {...props} />
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Chat', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // RoundProvider mounts alongside Chat and fires its own POST /api/v1/round
    // on mount — give every test a harmless default response for that call so
    // tests that only care about the chat POST don't need to special-case it.
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }),
    );
  });

  it('falls back to a known portrait when the round has no case portrait yet', () => {
    renderChat();
    const portrait = screen.getByAltText(/patient portrait/i);
    expect(portrait.getAttribute('src')).toMatch(/^\/patient-portraits\/.+\.png$/);
  });

  it('renders the active case portrait from the round payload', async () => {
    global.fetch = jest.fn().mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (new URL(url, 'http://api.test').pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              case: {
                id: 'case-1',
                patient: { portraitImageUrl: '/portraits/portrait-03.png' },
                documents: [],
              },
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ chatMessages: [], revealedDocuments: [] }), { status: 200 }),
      );
    });

    renderChat();

    await waitFor(() =>
      expect(screen.getByAltText(/patient portrait/i).getAttribute('src')).toBe(
        '/portraits/portrait-03.png',
      ),
    );
  });

  it('sends the doctor message to POST /api/v1/chat and renders the real patient reply', async () => {
    const user = userEvent.setup();
    let requestUrl;
    global.fetch = jest.fn().mockImplementation((input) => {
      requestUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            chatMessages: [
              { id: 'm1', sender: 'PLAYER', content: 'How long have you had this pain?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
              { id: 'm2', sender: 'PATIENT', content: 'About two days now, doctor.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
            ],
            revealedDocuments: [],
          }),
          { status: 200 },
        ),
      );
    });

    renderChat();

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'How long have you had this pain?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText('About two days now, doctor.')).toBeInTheDocument());
    expect(screen.getByText('How long have you had this pain?')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(requestUrl).toContain('/api/v1/chat');
  });

  it('shows an error and keeps the draft when the backend request fails', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'llm_failed' }), { status: 502 }));

    renderChat();

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'Does it itch?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/could not send/i)).toBeInTheDocument());
    expect(input).toHaveValue('Does it itch?');
    expect(screen.getByRole('log').textContent).not.toContain('Does it itch?');
  });

  it('shows the doctor message immediately, before the patient reply arrives', async () => {
    const user = userEvent.setup();
    let resolveFetch;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderChat();

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'How long have you had this pain?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText('How long have you had this pain?')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.queryByText('About two days now, doctor.')).not.toBeInTheDocument();

    resolveFetch(
      new Response(
        JSON.stringify({
          chatMessages: [
            { id: 'm1', sender: 'PLAYER', content: 'How long have you had this pain?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
            { id: 'm2', sender: 'PATIENT', content: 'About two days now, doctor.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
          ],
          revealedDocuments: [],
        }),
        { status: 200 },
      ),
    );

    await waitFor(() => expect(screen.getByText('About two days now, doctor.')).toBeInTheDocument());
    expect(screen.getByText('How long have you had this pain?')).toBeInTheDocument();
  });

  it('restores the conversation from localStorage after a remount', async () => {
    const user = userEvent.setup();
    // mockImplementation (not mockResolvedValue) so each call — RoundProvider's
    // mount fetch and Chat's send — gets its own Response, since a Response
    // body can only be read once.
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            chatMessages: [
              { id: 'm1', sender: 'PLAYER', content: 'Does it itch?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
              { id: 'm2', sender: 'PATIENT', content: 'Yes, especially at night.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
            ],
            revealedDocuments: [],
          }),
          { status: 200 },
        ),
      ),
    );

    const { unmount } = renderChat();
    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'Does it itch?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Yes, especially at night.')).toBeInTheDocument());

    unmount();
    renderChat();

    expect(screen.getByText('Does it itch?')).toBeInTheDocument();
    expect(screen.getByText('Yes, especially at night.')).toBeInTheDocument();
  });

  it('clears the persisted history for every session/case when "Clear history" is clicked', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            chatMessages: [
              { id: 'm1', sender: 'PLAYER', content: 'Does it itch?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
              { id: 'm2', sender: 'PATIENT', content: 'Yes, especially at night.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
            ],
            revealedDocuments: [],
          }),
          { status: 200 },
        ),
      ),
    );

    const { unmount } = renderChat();
    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'Does it itch?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Yes, especially at night.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /clear history/i }));
    expect(screen.queryByText('Yes, especially at night.')).not.toBeInTheDocument();

    unmount();
    renderChat();
    expect(screen.queryByText('Yes, especially at night.')).not.toBeInTheDocument();
  });

  it('loads the stored conversation once gameSessionId/caseId arrive after an initial mount without them', async () => {
    // Reproduces mounting Chat before the round data (gameSessionId/caseId) has
    // loaded from the backend — a real one-time useState initializer would lock
    // in the wrong (empty) conversation forever for that mount.
    window.localStorage.setItem(
      'patientPlease.chat.session-1:case-1',
      JSON.stringify([{ id: 'm1', sender: 'PATIENT', content: 'Already in the log.' }]),
    );

    const { rerender } = render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Chat gameSessionId={undefined} caseId={undefined} />
        </RoundProvider>
      </ApiProvider>,
    );

    expect(screen.queryByText('Already in the log.')).not.toBeInTheDocument();

    rerender(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Chat gameSessionId="session-1" caseId="case-1" />
        </RoundProvider>
      </ApiProvider>,
    );

    await waitFor(() => expect(screen.getByText('Already in the log.')).toBeInTheDocument());
  });

  it('merges revealedDocuments from a successful chat reply into RoundProvider case.documents', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(JSON.stringify({ case: { id: 'case-1', documents: [] } }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            chatMessages: [
              { id: 'm1', sender: 'PLAYER', content: 'Does it itch?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
              { id: 'm2', sender: 'PATIENT', content: 'Yes, especially at night.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
            ],
            revealedDocuments: [{ id: 'doc-1', title: 'Left shoulder — day 1', type: 'SKIN_IMAGE' }],
          }),
          { status: 200 },
        ),
      );
    });

    function DocumentsProbe() {
      const { round } = useRound();
      const titles = (round?.case?.documents ?? []).map((document) => document.title).join(',');
      return <span data-testid="doc-titles">{titles}</span>;
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Chat gameSessionId="session-1" caseId="case-1" />
          <DocumentsProbe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('doc-titles').textContent).toBe(''));

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'Does it itch?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByTestId('doc-titles').textContent).toBe('Left shoulder — day 1'),
    );
  });
});
