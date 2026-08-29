import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const allowedLicenses = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MPL-2.0',
  'Unlicense',
]);

const packages = new Map();

function normalizeLicense(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
      .filter(Boolean)
      .join(' OR ');
  }
  return value?.type?.trim() ?? '';
}

function isAllowedExpression(expression) {
  const alternatives = expression
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);

  return alternatives.some((alternative) =>
    alternative
      .split(/\s+AND\s+/i)
      .map((value) => value.trim())
      .every((license) => allowedLicenses.has(license)),
  );
}

async function visitPackage(packageDirectory) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
  } catch {
    return;
  }

  if (manifest.name && manifest.version) {
    packages.set(
      `${manifest.name}@${manifest.version}`,
      normalizeLicense(manifest.license ?? manifest.licenses),
    );
  }

  await visitNodeModules(path.join(packageDirectory, 'node_modules'));
}

async function visitNodeModules(nodeModulesDirectory) {
  let entries;
  try {
    entries = await readdir(nodeModulesDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const entryPath = path.join(nodeModulesDirectory, entry.name);
    if (entry.name.startsWith('@')) {
      const scopedPackages = await readdir(entryPath, { withFileTypes: true });
      for (const scopedPackage of scopedPackages) {
        if (scopedPackage.isDirectory()) {
          await visitPackage(path.join(entryPath, scopedPackage.name));
        }
      }
    } else {
      await visitPackage(entryPath);
    }
  }
}

await visitNodeModules(path.join(process.cwd(), 'node_modules'));

if (packages.size === 0) {
  console.error('License check failed: no installed dependencies found. Run npm ci first.');
  process.exitCode = 1;
} else {
  const findings = [...packages.entries()]
    .filter(([, license]) => !license || !isAllowedExpression(license))
    .map(([packageName, license]) => `${packageName}: ${license || 'license not declared'}`)
    .sort();

  if (findings.length > 0) {
    console.error('License check failed:');
    findings.forEach((finding) => console.error(`- ${finding}`));
    process.exitCode = 1;
  } else {
    console.log(`License check passed for ${packages.size} installed packages.`);
  }
}
