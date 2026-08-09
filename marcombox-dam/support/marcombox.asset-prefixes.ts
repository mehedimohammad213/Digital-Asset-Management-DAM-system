/** Filename prefixes created by automation — safe to delete during teardown. */
export const MARCOMBOX_AUTOMATION_PREFIXES = [
  'S1-VIDEO',
  'S2-IMAGE',
  'automation-video',
  'automation-image',
] as const;

export function isMarcomboxAutomationAsset(name: string): boolean {
  const lower = name.toLowerCase();
  return MARCOMBOX_AUTOMATION_PREFIXES.some((prefix) => lower.includes(prefix.toLowerCase()));
}
