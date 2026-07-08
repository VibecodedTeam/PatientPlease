import { jest } from '@jest/globals';
import {
  computeInventoryCapacity,
  resolveDayPhase,
  type DayPhasePrismaClient,
} from '../../src/services/dayPhase.js';

function createMockPrisma() {
  return {
    gameDayLog: {
      findFirst: jest.fn(),
    },
  };
}

describe('computeInventoryCapacity', () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
    [7, 4],
    [8, 4],
  ])('day %i has capacity %i', (dayNumber, expected) => {
    expect(computeInventoryCapacity(dayNumber)).toBe(expected);
  });
});

describe('resolveDayPhase', () => {
  it('resolves day 1, not night, when no GameDayLog exists yet', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(prisma.gameDayLog.findFirst).toHaveBeenCalledWith({
      where: { gameSessionId: 'session-uuid' },
      orderBy: { dayNumber: 'desc' },
    });
    expect(result).toEqual({ isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 });
  });

  it('resolves not-night, upcoming day 4, when the latest GameDayLog (day 3) is still open', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: null });

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(result).toEqual({ isNightPhase: false, upcomingDayNumber: 4, inventoryCapacity: 2 });
  });

  it('resolves night phase, upcoming day 4, capacity 2, when the latest GameDayLog (day 3) has ended', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date('2026-07-03T00:00:00.000Z') });

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(result).toEqual({ isNightPhase: true, upcomingDayNumber: 4, inventoryCapacity: 2 });
  });
});
