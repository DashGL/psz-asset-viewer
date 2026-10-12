// Asset IDs stay in URLs and fetch paths. Display names must never alias assets.
export const MOTHER_IDENTITIES: Record<string, string> = {
  boss_mother: 'Mother Trinity',
  boss_mother_piece: 'Mother Trinity Pieces',
  mother: 'Heaven Mother',
  mother_sword: 'Blade Mother',
  mother_gun: 'Shot Mother',
  mother_tech: 'Force Mother',
};

export function enemyDisplayName(id: string): string {
  return MOTHER_IDENTITIES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
