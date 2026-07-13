import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface RateLimitPluginOptions {
  max: number;
  timeWindow: number;
}

export default fp(async function rateLimitPlugin(
  fastify: FastifyInstance,
  opts: RateLimitPluginOptions,
) {
  await fastify.register(rateLimit, { max: opts.max, timeWindow: opts.timeWindow });
});
