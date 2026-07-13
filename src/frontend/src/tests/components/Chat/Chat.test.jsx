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
});
