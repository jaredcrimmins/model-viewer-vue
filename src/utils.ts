/**
* Optional props may be `null`, regardless of defined type guards or validators.
* If a consuming component passes `null` to an optional prop, prop validation
* will not run, allowing the `null` value to be passed without an error.
*/
export type OptionalProp<T> = T | null;

export type RequiredProp<T> = T;
