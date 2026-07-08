export interface DayPhaseGameDayLogRecord {
  dayNumber: number;
  endedAt: Date | null;
}

export interface DayPhaseInfo {
  isNightPhase: boolean;
  upcomingDayNumber: number;
  inventoryCapacity: number;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface DayPhasePrismaClient {
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string };
      orderBy: { dayNumber: 'desc' };
    }): Promise<DayPhaseGameDayLogRecord | null>;
  };
}

export class NotNightPhaseError extends Error {
  constructor(message = 'Action requires the night phase') {
    super(message);
    this.name = 'NotNightPhaseError';
  }
}

export function computeInventoryCapacity(dayNumber: number): number {
  return Math.ceil(dayNumber / 2);
}

export async function resolveDayPhase(
  prisma: DayPhasePrismaClient,
  gameSessionId: string,
): Promise<DayPhaseInfo> {
  const latest = await prisma.gameDayLog.findFirst({
    where: { gameSessionId },
    orderBy: { dayNumber: 'desc' },
  });

  const isNightPhase = latest !== null && latest.endedAt !== null;
  const upcomingDayNumber = (latest?.dayNumber ?? 0) + 1;

  return {
    isNightPhase,
    upcomingDayNumber,
    inventoryCapacity: computeInventoryCapacity(upcomingDayNumber),
  };
}
