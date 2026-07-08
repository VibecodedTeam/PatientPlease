import { seedDiagnoses, DIAGNOSES } from './diagnoses.js';
import { seedTreatments, TREATMENTS } from './treatments.js';
import { seedShopItems, SHOP_ITEMS } from './shopItems.js';
import { seedCases, CASE_BUNDLES } from './cases.js';
import type { SeedPrismaClient } from './types.js';

/** Seeds every content/reference table (Diagnosis, Treatment, ShopItem, Patient, Case,
 * CaseDocument, CaseHint). Never touches application/session data (User, GameSession,
 * GameDayLog, OwnedItem, DiagnosisAttempt, ChatMessage, GameplayLog) — see docs/architecture/0007.
 * Safe to run repeatedly: every row is upserted by a fixed id, so re-running (e.g. on every
 * container start) is a no-op against already-seeded data. */
export async function runSeed(prisma: SeedPrismaClient): Promise<void> {
  await seedDiagnoses(prisma);
  console.log(`Seeded ${DIAGNOSES.length} diagnoses`);

  await seedTreatments(prisma);
  console.log(`Seeded ${TREATMENTS.length} treatments`);

  await seedShopItems(prisma);
  console.log(`Seeded ${SHOP_ITEMS.length} shop items`);

  await seedCases(prisma);
  const documentCount = CASE_BUNDLES.reduce((sum, bundle) => sum + bundle.documents.length, 0);
  const hintCount = CASE_BUNDLES.reduce((sum, bundle) => sum + bundle.hints.length, 0);
  console.log(
    `Seeded ${CASE_BUNDLES.length} patients, ${CASE_BUNDLES.length} cases, ${documentCount} case documents, ${hintCount} case hints`,
  );
}
