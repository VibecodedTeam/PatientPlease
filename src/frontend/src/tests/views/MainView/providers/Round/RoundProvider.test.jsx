import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider, useRound } from '../../../../../views/MainView/providers/Round';

const ROUND_RESPONSE = {
  gameSession: {
    id: 'session-1',
    money: 100,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 1,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  ownedItems: [
    {
      id: 'owned-1',
      shopItem: {
        id: 'shop-1',
        sku: '89898',
        name: 'Handbook',
        description: 'book about ai',
        itemType: 'HANDBOOK',
        iconImageUrl: 'https://cdn.example.com/handbook.png',
      },
      purchasePrice: 100,
      purchasedOnDay: 2,
      purchasedAt: '2026-01-02T00:00:00.000Z',
      isEquipped: false,
    },
  ],
  case: {
    id: 'case-1',
    difficulty: 2,
    moneyReward: 50,
    moneyPenalty: 20,
    patient: {
      id: 'patient-1',
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      occupation: 'Roofer',
      portraitImageUrl: 'https://cdn.example.com/patients/jan.png',
      bodyModelVariant: 'male_average_01',
    },
    documents: [
      {
        id: 'doc-1',
        attentionPointRegion: 'LEFT_ARM',
        type: 'SKIN_IMAGE',
        title: 'Left shoulder — day 1',
        documentDate: '2026-01-01T00:00:00.000Z',
        sortOrder: 1,
        imageUrl: 'https://cdn.example.com/skin/lesion_01.png',
        imageWidthPx: 1024,
        imageHeightPx: 768,
        imageAltText: 'Asymmetric brown lesion, ~8mm',
        content: null,
      },
    ],
  },
  diagnosisOptions: [{ id: 'dg-1', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' }],
  treatmentOptions: [
    { id: 'tr-1', code: 'REFER_ONCO', name: 'Refer to oncology', kind: 'REFERRAL' },
  ],
};

function RoundConsumer() {
  const { round, isLoading, error } = useRound();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error: {error.message}</span>;
  return <span>patient {round?.case?.patient?.name}</span>;
}

function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <RoundConsumer />
      </RoundProvider>
    </ApiProvider>,
  );
}

function lastRequest() {
  return global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
}

describe('RoundProvider', () => {
  it('POSTs /api/v1/round and exposes the response via useRound', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));

    renderWithProviders();

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('patient Jan Kowalski')).toBeInTheDocument());

    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/round');
  });

  it('exposes an error via useRound when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    renderWithProviders();

    await waitFor(() => expect(screen.getByText(/^error:/)).toBeInTheDocument());
  });
});
