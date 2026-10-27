import { pathToFileURL } from 'node:url';

export function validateAndroidRelease(env) {
  if (env.ASH_NATIVE_PLATFORM !== 'android') throw new Error('Android release must select ASH_NATIVE_PLATFORM=android.');
  if (env.CAP_SERVER_URL !== 'https://ashglogroup.company') throw new Error('Android release must use the approved HTTPS production host.');
  const previous = env.ANDROID_PREVIOUS_VERSION_CODE;
  if (previous !== undefined && (!/^(0|[1-9][0-9]*)$/.test(previous) || BigInt(previous) > 2100000000n)) {
    throw new Error('ANDROID_PREVIOUS_VERSION_CODE must be the confirmed Play maximum from 0 to 2100000000 (0 only after confirming no previous uploads).');
  }
  let code = env.ANDROID_VERSION_CODE ?? '';
  const base = env.ANDROID_VERSION_CODE_BASE || previous;
  if (!code && base !== undefined) {
    const build = env.BUILD_NUMBER ?? '';
    if (!/^(0|[1-9][0-9]*)$/.test(base) || !/^[1-9][0-9]*$/.test(build)) {
      throw new Error('Version base must be a nonnegative integer and BUILD_NUMBER must be positive.');
    }
    code = String(BigInt(base) + BigInt(build));
  }
  if (!code) {
    throw new Error('Android release version is missing. In Codemagic google_play, set ANDROID_PREVIOUS_VERSION_CODE to the highest uploaded Play version and leave ANDROID_VERSION_CODE unset; CI adds BUILD_NUMBER. Alternatively set an explicit ANDROID_VERSION_CODE above that maximum. Check Play Console > ASH Glo > Test and release > App bundle explorer; use 0 as previous only if no bundles have ever been uploaded. No release version is guessed.');
  }
  if (!/^[1-9][0-9]*$/.test(code) || BigInt(code) > 2100000000n) {
    throw new Error('Set ANDROID_VERSION_CODE from 1 to 2100000000, higher than every previous Play upload.');
  }
  if (previous !== undefined && BigInt(code) <= BigInt(previous)) {
    throw new Error('Android version code must exceed ANDROID_PREVIOUS_VERSION_CODE from Play upload history.');
  }
  return Number(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = validateAndroidRelease(process.env);
  console.log(process.argv.includes('--version-code') ? code : 'Android release identity, HTTPS host and version format verified; prior Play upload history must be checked manually.');
}