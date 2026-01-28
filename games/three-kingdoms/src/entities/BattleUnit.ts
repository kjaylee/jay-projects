/**
 * 전투 유닛 인터페이스
 * Formation + Stage 데이터에서 변환된 전투 시 사용되는 유닛
 */
export interface BattleUnit {
  id: string;
  generalId: string;
  name: string;
  team: 'player' | 'enemy';
  position: { row: number; col: number };
  stats: {
    maxHp: number;
    currentHp: number;
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
  };
  skills: string[];
  skillCooldowns: Map<string, number>; // skillId → 남은 쿨다운
  isAlive: boolean;
}

/**
 * 전투 유닛 생성 헬퍼 함수
 */
export function createBattleUnit(params: {
  id: string;
  generalId: string;
  name: string;
  team: 'player' | 'enemy';
  position: { row: number; col: number };
  baseStats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
  };
  level?: number;
  skills?: string[];
}): BattleUnit {
  const level = params.level ?? 1;
  // 레벨당 스탯 10% 증가
  const levelMultiplier = 1 + (level - 1) * 0.1;

  const maxHp = Math.floor(params.baseStats.hp * levelMultiplier);

  const skills = params.skills ?? [];
  const skillCooldowns = new Map<string, number>();
  // 초기 쿨다운은 0 (바로 사용 가능)
  for (const skillId of skills) {
    skillCooldowns.set(skillId, 0);
  }

  return {
    id: params.id,
    generalId: params.generalId,
    name: params.name,
    team: params.team,
    position: params.position,
    stats: {
      maxHp,
      currentHp: maxHp,
      attack: Math.floor(params.baseStats.attack * levelMultiplier),
      defense: Math.floor(params.baseStats.defense * levelMultiplier),
      intelligence: Math.floor(params.baseStats.intelligence * levelMultiplier),
      speed: Math.floor(params.baseStats.speed * levelMultiplier),
    },
    skills,
    skillCooldowns,
    isAlive: true,
  };
}
