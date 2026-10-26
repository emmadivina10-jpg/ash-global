import { pathToFileURL } from 'node:url';

export function validateAndroidRelease(env) {
  if (env.ASH_NATIVE_PLATFORM !== 'android') throw new Error('Android release must select ASH_NATIVE_PLATFORM=android.');
  if (env.CAP_SERVER_URL !== 'https://ashglogroup.company') throw new Error('Android release must use the approved HTTPS production host.');
  const code = env.ANDROID_VERSION_CODE ?? '';
  if (!/^[1-9][0-9]*$/.test(code) || BigInt(code) > 2100000000n) {
    throw new Error('Set ANDROID_VERSION_CODE from 1 to 2100000000, higher than every previous Play upload.');
  }
  return Number(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateAndroidRelease(process.env);
  console.log('Android release identity, HTTPS host and version format verified; prior Play upload history must be checked manually.');
}