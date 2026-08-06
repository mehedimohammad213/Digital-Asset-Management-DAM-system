/** Filename / identity prefixes created by automation — safe to delete during teardown. */
export const AUTOMATION_PREFIXES = [
  'S1-VIDEO',
  'S2-IMAGE',
  'automation-video',
  'automation-image',
] as const;

export function isAutomationAsset(name: string): boolean {
  const lower = name.toLowerCase();
  return AUTOMATION_PREFIXES.some((prefix) => lower.includes(prefix.toLowerCase()));
}
