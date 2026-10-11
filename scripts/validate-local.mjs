// Database suites truncate tables: pin every child process to the local fixture.
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const logs = new URL('../.cache/validation/', import.meta.url);
mkdirSync(logs, { recursive: true });
const databaseUrl = 'postgres://openpartner:openpartner@127.0.0.1:55433/openpartner_test';
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_APP: databaseUrl,
  OPENPARTNER_APP_DB_PASSWORD: 'op_app_local_fixture_only',
  ADMIN_API_KEY: 'op_ci_0000000000000000000000000000000000000000000000000000000000',
  SECRETS_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
  NODE_ENV: 'test',
  OPENPARTNER_MODE: 'selfhost',
  OPENPARTNER_TENANCY: 'single',
  PORTAL_URL: 'http://localhost:5673',
  INTEGRATION: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  STRIPE_WEBHOOK_SECRET_PLATFORM: '',
  STRIPE_WEBHOOK_SECRET_CONNECT: '',
  SMTP_HOST: '',
  SMTP_PASSWORD: '',
  POSTMARK_SERVER_TOKEN: '',
  PLATFORM_OPS_EMAIL: '',
  NETWORK_URL: '',
  DO_API_TOKEN: '',
  HOSTED_FUNDING_ENABLED: '',
};

console.log(`Validation runtime: Node ${process.version}`);
const steps = process.argv.length > 2 ? [['targeted', process.argv.slice(2)]] : [
  ['db-build', ['--filter', '@openpartner/db', 'build']],
  ['migrate', ['migrate']],
  ['lint', ['lint']],
  ['typecheck', ['typecheck']],
  ['test', ['test']],
  ['build', ['build']],
];
for (const [name, args] of steps) {
  const logPath = fileURLToPath(new URL(`${name}.log`, logs));
  console.log(`${name} started; log: ${logPath}`);
  const descriptor = openSync(logPath, 'w');
  let result;
  try {
    result = spawnSync('rtk', ['proxy', 'pnpm', ...args], {
      cwd, env, stdio: ['ignore', descriptor, descriptor],
    });
  } finally {
    closeSync(descriptor);
  }
  if (result.error || result.status !== 0) {
    console.error(`${name} failed (${result.error?.message ?? `exit ${result.status}`}). Read ${logPath}`);
    process.exit(1);
  }
  console.log(`${name} passed`);
}
