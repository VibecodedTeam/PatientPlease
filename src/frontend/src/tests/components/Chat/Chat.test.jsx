import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { Chat } from '../../../components/Chat';

function renderChat(props = {}) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <Chat gameSessionId="session-1" caseId="case-1" {...props} />
    </ApiProvider>,
  );
}

describe('Chat', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders a patient portrait chosen from the known portrait set', () => {
    renderChat();
    const portrait = screen.getByAltText(/patient portrait/i);
    expect(portrait.getAttribute('src')).toMatch(/^\/patient-portraits\/.+\.png$/);
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

  it('clears a stale send error from the previous patient once a new case loads', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'llm_failed' }), { status: 502 }));

    const { rerender } = render(
      <ApiProvider baseUrl="http://api.test">
        <Chat gameSessionId="session-1" caseId="case-1" />
      </ApiProvider>,
    );

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'Does it itch?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText(/could not send/i)).toBeInTheDocument());

    // Moving on to the next patient re-renders Chat with a new caseId — the
    // error banner from the previous, unrelated patient must not linger.
    rerender(
      <ApiProvider baseUrl="http://api.test">
        <Chat gameSessionId="session-1" caseId="case-2" />
      </ApiProvider>,
    );

    expect(screen.queryByText(/could not send/i)).not.toBeInTheDocument();
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
    global.fetch = jest.fn().mockResolvedValue(
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
    global.fetch = jest.fn().mockResolvedValue(
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
        <Chat gameSessionId={undefined} caseId={undefined} />
      </ApiProvider>,
    );

    expect(screen.queryByText('Already in the log.')).not.toBeInTheDocument();

    rerender(
      <ApiProvider baseUrl="http://api.test">
        <Chat gameSessionId="session-1" caseId="case-1" />
      </ApiProvider>,
    );

    await waitFor(() => expect(screen.getByText('Already in the log.')).toBeInTheDocument());
  });
});
