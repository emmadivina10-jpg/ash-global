import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateAndroidRelease } from '../scripts/android-release-preflight.mjs';

const env = { ASH_NATIVE_PLATFORM: 'android', CAP_SERVER_URL: 'https://ashglogroup.company', ANDROID_VERSION_CODE: '2' };
describe('Android release safety', () => {
  it('preserves the exact registered Android application ID', () => {
    const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
    expect(gradle.match(/applicationId "([^"]+)"/)?.[1]).toBe('com.ashglogroup.app');
  });
  it('android workflow imports android_release and keeps signing', () => {
    const y = readFileSync(new URL('../codemagic.yaml', import.meta.url), 'utf8');
    const a = y.slice(y.indexOf('android-play:'));
    expect(a).toMatch(/groups:\n\s+- google_play\n\s+- android_release/);
    expect(a).toContain('- ash_glo_keystore');
  });
  it('first upload: previous 0 + build 1 gives versionCode 1, and grows with builds', () => {
    const e = { ...env, ANDROID_VERSION_CODE: '', ANDROID_PREVIOUS_VERSION_CODE: '0' };
    expect(validateAndroidRelease({ ...e, BUILD_NUMBER: '1' })).toBe(1);
    expect(validateAndroidRelease({ ...e, BUILD_NUMBER: '5' })).toBe(5);
  });
  it('accepts an explicit positive release version', () => expect(validateAndroidRelease(env)).toBe(2));
  it('accepts version 1 only as an explicit input, not a missing-input default', () => {
    expect(validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '1' })).toBe(1);
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: undefined })).toThrow('version is missing');
  });
  it.each(['', '0', '-1', '1.5', '2100000001'])('rejects invalid version %s', code => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: code })).toThrow();
  });
  it('accepts the Play version upper bound', () => expect(validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '2100000000' })).toBe(2100000000));
  it('rejects an iOS build context', () => expect(() => validateAndroidRelease({ ...env, ASH_NATIVE_PLATFORM: 'ios' })).toThrow());
  it('rejects a substituted production endpoint', () => expect(() => validateAndroidRelease({ ...env, CAP_SERVER_URL: 'http://localhost' })).toThrow());
  it('increments versions with Codemagic build numbers above an owner-confirmed base', () => {
    const automatic = { ...env, ANDROID_VERSION_CODE: '', ANDROID_VERSION_CODE_BASE: '100', BUILD_NUMBER: '7', ANDROID_PREVIOUS_VERSION_CODE: '100' };
    expect(validateAndroidRelease(automatic)).toBe(107);
    expect(validateAndroidRelease({ ...automatic, BUILD_NUMBER: '8' })).toBe(108);
  });
  it.each(['2', '3'])('rejects a code not above previous Play code %s', previous => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_PREVIOUS_VERSION_CODE: previous })).toThrow();
  });
  it('rejects overflowing computed versions', () => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_VERSION_CODE_BASE: '2100000000', BUILD_NUMBER: '1' })).toThrow();
  });
  it('rejects a missing Codemagic build counter for automatic versioning', () => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_VERSION_CODE_BASE: '100' })).toThrow();
  });
  it('uses the confirmed Play maximum with the build counter when no base is supplied', () => {
    expect(validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_PREVIOUS_VERSION_CODE: '100', BUILD_NUMBER: '7' })).toBe(107);
  });
  it('supports confirmed first-upload history without inventing version 1', () => {
    expect(validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_PREVIOUS_VERSION_CODE: '0', BUILD_NUMBER: '7' })).toBe(7);
  });
  it.each(['', '-1', '1.5', '2100000001'])('rejects invalid previous Play maximum %s', previous => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_PREVIOUS_VERSION_CODE: previous })).toThrow();
  });
  it.each(['0', '-1', '1.5', 'build-7'])('rejects invalid automatic build counter %s', build => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_PREVIOUS_VERSION_CODE: '100', BUILD_NUMBER: build })).toThrow();
  });
  it('rejects overflow computed from the previous Play maximum', () => {
    expect(() => validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '', ANDROID_PREVIOUS_VERSION_CODE: '2100000000', BUILD_NUMBER: '1' })).toThrow();
  });
  it('preserves explicit version priority and checks it against Play history', () => {
    expect(validateAndroidRelease({ ...env, ANDROID_VERSION_CODE: '108', ANDROID_VERSION_CODE_BASE: '100', BUILD_NUMBER: '7', ANDROID_PREVIOUS_VERSION_CODE: '100' })).toBe(108);
  });
  it('outputs the exact resolved numeric code for CI and fails closed on missing input', () => {
    const script = new URL('../scripts/android-release-preflight.mjs', import.meta.url).pathname;
    const ci = { PATH: process.env.PATH, ASH_NATIVE_PLATFORM: env.ASH_NATIVE_PLATFORM, CAP_SERVER_URL: env.CAP_SERVER_URL };
    const valid = spawnSync(process.execPath, [script, '--version-code'], { env: { ...ci, ANDROID_PREVIOUS_VERSION_CODE: '100', BUILD_NUMBER: '7' }, encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stdout.trim()).toBe('107');
    const missing = spawnSync(process.execPath, [script, '--version-code'], { env: ci, encoding: 'utf8' });
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).toBe('');
  });
});