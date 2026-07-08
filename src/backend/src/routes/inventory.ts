import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError } from '../services/game.js';
import { NotNightPhaseError } from '../services/dayPhase.js';
import {
  InventoryCapacityExceededError,
  ItemNotOwnedError,
  getInventory,
  updateEquippedItems,
} from '../services/inventory.js';

interface UpdateInventoryBody {
  equippedItemIds: string[];
}

export default function inventoryRoutes(fastify: FastifyInstance): void {
  fastify.get('/api/v1/inventory', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const inventory = await getInventory(prisma, user.id);
    return reply.status(200).send(inventory);
  });

  fastify.put<{ Body: UpdateInventoryBody }>(
    '/api/v1/inventory',
    {
      schema: {
        body: {
          type: 'object',
          required: ['equippedItemIds'],
          properties: {
            equippedItemIds: { type: 'array', items: { type: 'string', minLength: 1 } },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await request.getCurrentUser();
      if (!user) {
        return reply.status(401).send({ error: 'unauthenticated' });
      }

      try {
        const result = await updateEquippedItems(prisma, user.id, request.body.equippedItemIds);
        return await reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NoActiveGameError) {
          return reply.status(409).send({ error: 'no_active_game' });
        }
        if (error instanceof NotNightPhaseError) {
          return reply.status(409).send({ error: 'not_night_phase' });
        }
        if (error instanceof InventoryCapacityExceededError) {
          return reply.status(409).send({ error: 'inventory_capacity_exceeded' });
        }
        if (error instanceof ItemNotOwnedError) {
          return reply.status(409).send({ error: 'item_not_owned' });
        }
        throw error;
      }
    },
  );
}
