/** Compat Next.js 14 sync params / Next.js 15 Promise params. */
export async function resolveParams<T extends Record<string, string>>(
  params: T | Promise<T>,
): Promise<T> {
  return Promise.resolve(params);
}
