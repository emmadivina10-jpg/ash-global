import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const dir = mkdtempSync(join(tmpdir(), 'ash-signature-test-'));
const password = randomBytes(24).toString('hex');
const store = join(dir, 'fixture.p12');
const env = { ...process.env, CM_KEYSTORE_PASSWORD: password, CM_KEYSTORE_PATH: store, CM_KEY_ALIAS: 'expected' };
const verifier = new URL('../scripts/VerifyAndroidBundle.java', import.meta.url).pathname;
function run(tool, args, overrides = {}) {
  return spawnSync(tool, args, { env: { ...env, ...overrides }, encoding: 'utf8' });
}
function succeeds(tool, args) {
  assert.equal(run(tool, args).status, 0, `${tool} fixture command failed`);
}
try {
  for (const alias of ['expected', 'other']) {
    succeeds('keytool', ['-genkeypair', '-alias', alias, '-keyalg', 'RSA', '-keystore', store, '-storetype', 'PKCS12', '-storepass:env', 'CM_KEYSTORE_PASSWORD', '-dname', 'CN=Isolated test fixture', '-validity', '1']);
  }
  const payload = join(dir, 'payload.txt');
  writeFileSync(payload, 'verified payload');
  const signed = join(dir, 'signed.jar');
  succeeds('jar', ['--create', '--file', signed, '-C', dir, 'payload.txt']);
  succeeds('jarsigner', ['-keystore', store, '-storepass:env', 'CM_KEYSTORE_PASSWORD', signed, 'expected']);
  assert.equal(run('java', [verifier, signed]).status, 0, 'Expected certificate should pass');
  assert.notEqual(run('java', [verifier, signed], { CM_KEY_ALIAS: 'other' }).status, 0, 'Wrong certificate must fail');
  const unsigned = join(dir, 'unsigned.jar');
  succeeds('jar', ['--create', '--file', unsigned, '-C', dir, 'payload.txt']);
  assert.notEqual(run('java', [verifier, unsigned]).status, 0, 'Unsigned payload must fail');
  writeFileSync(payload, 'tampered payload');
  succeeds('jar', ['--update', '--file', signed, '-C', dir, 'payload.txt']);
  assert.notEqual(run('java', [verifier, signed]).status, 0, 'Tampered payload must fail');
  console.log('PASS: 4 isolated Java signature checks (expected signer, wrong signer, unsigned, tampered). No real signing keys used.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}