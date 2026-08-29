import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
]);
const textExtensions = new Set([
  '.css',
  '.drawio',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const extensionlessFiles = new Set(['Dockerfile', 'LICENSE']);

// SHA-256 values let the repository block known inherited phrases without
// retaining those phrases in source control.
const forbiddenPhraseHashes = new Set([
  'ca5e8bb93106e2488988c4bef9be4dcf4a6047254b4a4d4f6a6d3da350b918e3',
  'c0d2d529df7d0c552bd3901ca5008061396160cb4e3c18d935b9ff1b5a7e1a9b',
  'a5a2bef013669ba37a8b13796c6b1e6e257c97dd859440ca569f8275db5d9c80',
  '152b6f91b4dbd642daf2ec836513a9d21d6eedd9948c3a5304b9f8546d582e4d',
  'dc9d31f9af4e9f8c6b31980417137956056f040bd952ce11048cfbb9801cbf0c',
  'cc13e70747aacb8f37fcfcf2380b150eec5bf887348eba56324a3d5385c4599c',
  'df00cbf42bde5335ff8a60465e78f367dc6b519be1011b66db8349e558ec29ab',
  'c108f9afa4843d204942ed0ddd9146de4c229979991b150a1089d4be71b0298e',
  '46d37c056327a2437590b3f61879e12eaeea8beabf1dcb4860df6483411d056e',
  'bd732730bd39834d83bf92a114960180d3bd4a6f1309307165e6f30ed9846fdd',
  '6daa66ce38b7a9472ddc1274cb0e0b1ed7729edccbfcaa0105f2e48d78b96757',
  '879473b2ab1d2992629420805baf3721dc14a40793c2d4bc406bc86500f82125',
  '2eb61bb0f43b620833c03f215b55dea62aeb7ebcd10551cba1f83d05ba769523',
]);

const emailPattern =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const coordinatePattern =
  /\b(?:lat|lng|latitude|longitude)\s*[:=]\s*-?\d+(?:\.\d+)?/gi;
const ipv4Pattern =
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedWords(value) {
  return value
    .replace(/data:[^"']+/gi, ' embedded data ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function containsForbiddenPhrase(line) {
  const words = normalizedWords(line);

  for (let length = 1; length <= 4; length += 1) {
    for (let index = 0; index + length <= words.length; index += 1) {
      const phrase = words.slice(index, index + length).join(' ');
      if (forbiddenPhraseHashes.has(sha256(phrase))) {
        return true;
      }
    }
  }

  return false;
}

function isAllowedIpv4(value) {
  const octets = value.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first, second, third] = octets;
  return (
    (first === 0 && second === 0 && third === 0) ||
    (first === 127 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectFiles(absolutePath)));
      }
      continue;
    }

    if (
      extensionlessFiles.has(entry.name) ||
      textExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

const findings = [];
const files = await collectFiles(repositoryRoot);

for (const absolutePath of files) {
  const relativePath = path.relative(repositoryRoot, absolutePath);
  const content = await readFile(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const location = `${relativePath}:${index + 1}`;

    if (containsForbiddenPhrase(line)) {
      findings.push(`${location} contains a blocked inherited phrase`);
    }

    if (emailPattern.test(line)) {
      findings.push(`${location} contains an email address`);
    }
    emailPattern.lastIndex = 0;

    if (coordinatePattern.test(line)) {
      findings.push(`${location} contains precise coordinates`);
    }
    coordinatePattern.lastIndex = 0;

    for (const match of line.matchAll(ipv4Pattern)) {
      if (!isAllowedIpv4(match[0])) {
        findings.push(`${location} contains a non-documentation IPv4 address`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Privacy check failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`Privacy check passed across ${files.length} text files.`);
}
