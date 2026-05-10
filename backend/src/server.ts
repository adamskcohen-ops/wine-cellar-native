import { execFileSync } from 'node:child_process';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const host = '0.0.0.0';
const app = createApp();

if (env.NODE_ENV === 'production' && process.env.SKIP_PRISMA_MIGRATE !== 'true') {
  console.log('running prisma migrations');
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
}

const server = app.listen(env.PORT, host, () => {
  console.log(`wine-cellar-api listening on ${host}:${env.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`received ${signal}, shutting down gracefully`);

  server.close(async (error) => {
    if (error) {
      console.error('error while closing server', error);
      process.exit(1);
    }

    try {
      await prisma.$disconnect();
      process.exit(0);
    } catch (disconnectError) {
      console.error('error while disconnecting prisma', disconnectError);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  console.error('unhandled rejection', reason);
});
process.on('uncaughtException', (error) => {
  console.error('uncaught exception', error);
  process.exit(1);
});
