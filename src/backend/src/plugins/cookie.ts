import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface CookiePluginOptions {
  secret: string;
}

export default fp(async function cookiePlugin(fastify: FastifyInstance, opts: CookiePluginOptions) {
  await fastify.register(cookie, { secret: opts.secret, hook: 'onRequest' });
});
