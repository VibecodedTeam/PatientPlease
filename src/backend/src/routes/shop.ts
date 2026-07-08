import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError } from '../services/game.js';
import { NotNightPhaseError } from '../services/dayPhase.js';
import {
  ItemAlreadyOwnedError,
  ItemLockedError,
  ItemNotFoundError,
  InsufficientFundsError,
  getShopCatalog,
  purchaseItem,
} from '../services/shop.js';

interface PurchaseBody {
  shopItemId: string;
}

export default function shopRoutes(fastify: FastifyInstance): void {
  fastify.get('/api/v1/shop', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const catalog = await getShopCatalog(prisma, user.id);
    return reply.status(200).send(catalog);
  });

  fastify.post<{ Body: PurchaseBody }>(
    '/api/v1/shop/purchase',
    {
      schema: {
        body: {
          type: 'object',
          required: ['shopItemId'],
          properties: { shopItemId: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const user = await request.getCurrentUser();
      if (!user) {
        return reply.status(401).send({ error: 'unauthenticated' });
      }

      try {
        const result = await purchaseItem(prisma, user.id, request.body.shopItemId);
        return await reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NoActiveGameError) {
          return reply.status(409).send({ error: 'no_active_game' });
        }
        if (error instanceof NotNightPhaseError) {
          return reply.status(409).send({ error: 'not_night_phase' });
        }
        if (error instanceof ItemNotFoundError) {
          return reply.status(404).send({ error: 'item_not_found' });
        }
        if (error instanceof ItemLockedError) {
          return reply.status(409).send({ error: 'item_locked' });
        }
        if (error instanceof ItemAlreadyOwnedError) {
          return reply.status(409).send({ error: 'item_already_owned' });
        }
        if (error instanceof InsufficientFundsError) {
          return reply.status(409).send({ error: 'insufficient_funds' });
        }
        throw error;
      }
    },
  );
}
