/** 静的 export 配下の public JSON を fetch する（後続 issue で短 TTL API に差し替え）。 */
export async function fetchPublicJson<T>(path: string): Promise<T> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(normalized);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${normalized}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
