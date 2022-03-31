export function deserializeUrl(url: string | null) {
  return (!!url && url !== 'null') ? toFullUrl(url) : null;
}

/** Converts a partial URL string to a fully qualified URL string. */
export function toFullUrl(partialUrl: string) {
  const url = new URL(partialUrl, window.location.toString());

  return url.toString();
}

export function timePasses(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {Number} value
 * @param {Number} lowerLimit
 * @param {Number} upperLimit
 * @return {Number} value clamped within lowerLimit..upperLimit
 */
export function clamp(
  value: number,
  lowerLimit: number,
  upperLimit: number
) {
  return Math.max(lowerLimit, Math.min(upperLimit, value));
}

//
// Vue utilities
//

/**
* Optional props may be `null`, regardless of defined type guards or validators.
* If a consuming component passes `null` to an optional prop, prop validation
* will not run, allowing the `null` value to be passed without an error.
*/
export type OptionalProp<T> = T | null;

export type RequiredProp<T> = T;
