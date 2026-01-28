/**
 * 시너지 단계별 보너스 계산
 */

export interface SynergyTier {
  count: number;
  bonus: number;
}

/** 세력 시너지 테이블 (2/3/4/5명) */
export const FACTION_SYNERGY_TIERS: SynergyTier[] = [
  { count: 2, bonus: 0.05 },  // 5% 공격력
  { count: 3, bonus: 0.10 },  // 10% 공격력
  { count: 4, bonus: 0.15 },  // 15% 공격력
  { count: 5, bonus: 0.20 },  // 20% 공격력 + 방어력 5%
];

/** 클래스 시너지 테이블 (2/3/4명) */
export const CLASS_SYNERGY_TIERS: SynergyTier[] = [
  { count: 2, bonus: 0.05 },  // 5%
  { count: 3, bonus: 0.10 },  // 10%
  { count: 4, bonus: 0.15 },  // 15%
];

export interface SynergyDetail {
  name: string;
  count: number;
  bonus: number;
}

export interface TieredSynergyResult {
  attackBonus: number;
  defenseBonus: number;
  factionSynergies: Array<{ faction: string; count: number; bonus: number }>;
  classSynergies: Array<{ className: string; count: number; bonus: number }>;
}

/**
 * 단계별 보너스 계산
 */
export function getSynergyBonus(count: number, tiers: SynergyTier[]): number {
  let bonus = 0;
  for (const tier of tiers) {
    if (count >= tier.count) {
      bonus = tier.bonus;
    }
  }
  return bonus;
}

/**
 * 진형 시너지 상세 계산 (단계별)
 */
export function calculateTieredSynergy(
  units: string[],
  factions: Record<string, string>,
  classes: Record<string, string>
): TieredSynergyResult {
  let attackBonus = 0;
  let defenseBonus = 0;
  const factionSynergies: Array<{ faction: string; count: number; bonus: number }> = [];
  const classSynergies: Array<{ className: string; count: number; bonus: number }> = [];

  // 세력별 카운트
  const factionCounts: Record<string, number> = {};
  for (const unitId of units) {
    const faction = factions[unitId];
    if (faction) {
      factionCounts[faction] = (factionCounts[faction] || 0) + 1;
    }
  }

  // 세력 시너지 계산
  for (const [faction, count] of Object.entries(factionCounts)) {
    const bonus = getSynergyBonus(count, FACTION_SYNERGY_TIERS);
    if (bonus > 0) {
      attackBonus += bonus;
      factionSynergies.push({ faction, count, bonus });

      // 5명 이상이면 방어력 보너스도
      if (count >= 5) {
        defenseBonus += 0.05;
      }
    }
  }

  // 클래스별 카운트
  const classCounts: Record<string, number> = {};
  for (const unitId of units) {
    const cls = classes[unitId];
    if (cls) {
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    }
  }

  // 클래스 시너지 계산
  for (const [className, count] of Object.entries(classCounts)) {
    const bonus = getSynergyBonus(count, CLASS_SYNERGY_TIERS);
    if (bonus > 0) {
      defenseBonus += bonus;
      classSynergies.push({ className, count, bonus });
    }
  }

  return {
    attackBonus,
    defenseBonus,
    factionSynergies,
    classSynergies,
  };
}

/**
 * 시너지 요약 문자열 생성
 */
export function getSynergySummary(result: TieredSynergyResult): string {
  const parts: string[] = [];

  if (result.factionSynergies.length > 0) {
    const factionText = result.factionSynergies
      .map(s => `${s.faction} ${s.count}명(+${Math.round(s.bonus * 100)}% ATK)`)
      .join(', ');
    parts.push(`세력: ${factionText}`);
  }

  if (result.classSynergies.length > 0) {
    const classText = result.classSynergies
      .map(s => `${s.className} ${s.count}명(+${Math.round(s.bonus * 100)}% DEF)`)
      .join(', ');
    parts.push(`클래스: ${classText}`);
  }

  if (parts.length === 0) {
    return '시너지 없음';
  }

  return parts.join(' | ');
}
