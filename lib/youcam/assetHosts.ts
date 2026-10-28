/** Hosts that serve YouCam result masks and images (docs/youcam-api-notes.md). */
export const ASSET_HOSTS: readonly string[] = ['yce-us.s3-accelerate.amazonaws.com'];

/** True only for https URLs on an allowlisted host. */
export function isAllowedAssetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ASSET_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
