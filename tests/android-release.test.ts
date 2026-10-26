import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateAndroidRelease } from '../scripts/android-release-preflight.mjs';

const env = { ASH_NATIVE_PLATFORM: 'android', CAP_SERVER_URL: 'https://ashglogroup.company', ANDROID_VERSION_CODE: '2' };
describe('Android release safety', () => {
  it('preserves the exact registered Android application ID', () => {
    const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
    expect(gradle.match(/applicationId "([^"]+)"/)?.[1]).toBe('com.ashglogroup.app');
  });
  it('accepts an explicit positive release version', () => expect(validateAndroidRelease(env)).toBe(2));
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
});