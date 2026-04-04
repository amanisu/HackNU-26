export function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}