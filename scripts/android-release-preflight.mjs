import { pathToFileURL } from 'node:url';

export function validateAndroidRelease(env) {
  if (env.ASH_NATIVE_PLATFORM !== 'android') throw new Error('Android release must select ASH_NATIVE_PLATFORM=android.');
  if (env.CAP_SERVER_URL !== 'https://ashglogroup.company') throw new Error('Android release must use the approved HTTPS production host.');
  let code = env.ANDROID_VERSION_CODE ?? '';
  if (!code && env.ANDROID_VERSION_CODE_BASE) {
    const base = env.ANDROID_VERSION_CODE_BASE;
    const build = env.BUILD_NUMBER ?? '';
    if (!/^(0|[1-9][0-9]*)$/.test(base) || !/^[1-9][0-9]*$/.test(build)) {
      throw new Error('Version base must be a nonnegative integer and BUILD_NUMBER must be positive.');
    }
    code = String(BigInt(base) + BigInt(build));
  }
  if (!/^[1-9][0-9]*$/.test(code) || BigInt(code) > 2100000000n) {
    throw new Error('Set ANDROID_VERSION_CODE from 1 to 2100000000, higher than every previous Play upload.');
  }
  const previous = env.ANDROID_PREVIOUS_VERSION_CODE;
  if (previous !== undefined && (!/^(0|[1-9][0-9]*)$/.test(previous) || BigInt(code) <= BigInt(previous))) {
    throw new Error('Android version code must exceed ANDROID_PREVIOUS_VERSION_CODE from Play upload history.');
  }
  return Number(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = validateAndroidRelease(process.env);
  console.log(process.argv.includes('--version-code') ? code : 'Android release identity, HTTPS host and version format verified; prior Play upload history must be checked manually.');
}