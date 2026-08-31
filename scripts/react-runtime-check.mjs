import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';

const dashboardRequire = createRequire(
  new URL('../packages/dashboard/package.json', import.meta.url),
);

const dashboardReactPath = realpathSync(dashboardRequire.resolve('react'));
const routerRequire = createRequire(
  dashboardRequire.resolve('react-router-dom'),
);
const routerReactPath = realpathSync(routerRequire.resolve('react'));

if (dashboardReactPath !== routerReactPath) {
  console.error('React runtime check failed: multiple React copies are in use.');
  console.error(`Dashboard React: ${dashboardReactPath}`);
  console.error(`Router React: ${routerReactPath}`);
  process.exit(1);
}

const { version } = dashboardRequire('react');
console.log(`React runtime check passed with one shared React ${version}.`);
