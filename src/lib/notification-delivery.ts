/** Remote native push owns its OS banner; never mirror it as a local alert. */
export function shouldMirrorDeviceAlert(native: boolean, visibility: string): boolean {
  return !native && visibility === "hidden";
}