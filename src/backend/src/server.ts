import 'dotenv/config';
import { buildApp } from './app.js';
import { resolveDevSessionEnabled, resolvePort } from './config.js';

const app = buildApp({
  enableDevSession: resolveDevSessionEnabled(process.env['ENABLE_DEV_SESSION']),
});
const port = resolvePort(process.env['PORT'], 4000);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Server listening on port ${port}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
