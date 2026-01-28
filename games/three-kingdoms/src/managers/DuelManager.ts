/**
 * DuelManager - 일기토 시스템
 * 
 * 영걸전/코에이 삼국지 스타일의 일기토 시스템
 * 
 * 기능:
 * - 특정 장수 조합이 인접했을 때 자동 트리거
 * - 무력 상위 장수끼리 5% 확률로 랜덤 발생
 * - 3라운드 턴제 대결 (무력 기반)
 */

import { BattleUnit } from '../entities/BattleUnit';

export type DuelAction = 'attack' | 'defend' | 'evade';

export interface DuelRound {
  round: number;
  challenger: { action: DuelAction; roll: number };
  defender: { action: DuelAction; roll: number };
  winner: 'challenger' | 'defender' | 'draw';
  description: string;
}

export interface DuelResult {
  challenger: BattleUnit;
  defender: BattleUnit;
  rounds: DuelRound[];
  finalWinner: 'challenger' | 'defender' | 'draw';
  challengerHpChange: number;
  defenderHpChange: number;
  expBonus: number;
  isFamousDuel: boolean;
  duelName?: string;
}

export interface FamousDuel {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  generals: [string, string]; // [challenger, defender] general IDs
  storyText: string;
}

/**
 * 유명 일기토 데이터
 */
export const FAMOUS_DUELS: FamousDuel[] = [
  {
    id: 'guan_yu_vs_hua_xiong',
    name: '관우의 화웅 참수',
    nameEn: 'Guan Yu slays Hua Xiong',
    description: '온주를 따뜻이 하기도 전에 화웅의 목을 베어 왔다',
    generals: ['guan_yu', 'hua_xiong'],
    storyText: '관우가 조조가 따라준 술이 식기도 전에 화웅의 목을 베어왔다.',
  },
  {
    id: 'zhang_fei_vs_lu_bu',
    name: '장비 vs 여포',
    nameEn: 'Zhang Fei vs Lu Bu',
    description: '호로관에서 여포에게 도전한 장비',
    generals: ['zhang_fei', 'lu_bu'],
    storyText: '장비가 사모창을 휘두르며 여포에게 덤볐다!',
  },
  {
    id: 'zhao_yun_vs_zhang_he',
    name: '조운 vs 장합',
    nameEn: 'Zhao Yun vs Zhang He',
    description: '상산의 용과 하북의 명장',
    generals: ['zhao_yun', 'zhang_he'],
    storyText: '상산 조자룡이 장창을 휘둘러 장합에게 맞섰다!',
  },
  {
    id: 'ma_chao_vs_xu_chu',
    name: '마초 vs 허저',
    nameEn: 'Ma Chao vs Xu Chu',
    description: '서량의 금마초와 위나라 호치',
    generals: ['ma_chao', 'xu_chu'],
    storyText: '마초의 창과 허저의 쌍철퇴가 불꽃을 튀겼다!',
  },
  {
    id: 'lu_bu_vs_three_brothers',
    name: '삼영전여포',
    nameEn: 'Three Brothers vs Lu Bu',
    description: '유관장 삼형제가 여포에게 도전',
    generals: ['liu_bei', 'lu_bu'],
    storyText: '유비, 관우, 장비 삼형제가 힘을 합쳐 여포에 맞섰다!',
  },
  {
    id: 'guan_yu_vs_yan_liang',
    name: '관우의 안량 참수',
    nameEn: 'Guan Yu slays Yan Liang',
    description: '만군 속 안량의 목을 베다',
    generals: ['guan_yu', 'yan_liang'],
    storyText: '관우가 적토마를 달려 만군 중 안량의 목을 베었다!',
  },
  {
    id: 'guan_yu_vs_wen_chou',
    name: '관우의 문추 참수',
    nameEn: 'Guan Yu slays Wen Chou',
    description: '연주에서 문추를 베다',
    generals: ['guan_yu', 'wen_chou'],
    storyText: '관우가 청룡언월도를 휘둘러 문추를 참했다!',
  },
  {
    id: 'xu_chu_vs_dian_wei',
    name: '허저 vs 전위',
    nameEn: 'Xu Chu vs Dian Wei',
    description: '두 맹장의 대결',
    generals: ['xu_chu', 'dian_wei'],
    storyText: '허저와 전위, 두 호치가 힘을 겨루었다!',
  },
  {
    id: 'sun_ce_vs_taishi_ci',
    name: '손책 vs 태사자',
    nameEn: 'Sun Ce vs Taishi Ci',
    description: '소패왕과 동래의 용사',
    generals: ['sun_ce', 'taishi_ci'],
    storyText: '소패왕 손책과 태사자가 신정에서 맞붙었다!',
  },
  {
    id: 'huang_zhong_vs_guan_yu',
    name: '황충 vs 관우',
    nameEn: 'Huang Zhong vs Guan Yu',
    description: '장사성에서의 대결',
    generals: ['huang_zhong', 'guan_yu'],
    storyText: '노장 황충과 관우가 장사에서 대결했다!',
  },
];

/**
 * 일기토 상수
 */
export const DUEL_CONFIG = {
  maxRounds: 3,                    // 최대 라운드
  randomDuelChance: 0.05,          // 랜덤 발생 확률 (5%)
  minPowerForRandomDuel: 85,       // 랜덤 일기토 발생 최소 무력
  victoryExpBonus: 50,             // 승리 시 경험치 보너스
  defeatHpPenalty: 0.5,            // 패배 시 HP 감소 (50%)
  drawHpPenalty: 0.2,              // 무승부 시 HP 감소 (20%)
  attackBonus: 1.2,                // 공격 선택 시 보너스
  defendBonus: 1.3,                // 방어 선택 시 보너스
  evadeBonus: 1.5,                 // 회피 선택 시 보너스 (성공 시)
  evadeFailPenalty: 0.7,           // 회피 실패 시 패널티
};

/**
 * 액션 상성
 * attack > evade (회피 중 공격 당함)
 * evade > defend (방어를 회피로 무력화)
 * defend > attack (공격을 막음)
 */
const ACTION_ADVANTAGE: Record<DuelAction, DuelAction> = {
  attack: 'evade',   // 공격이 회피에 유리
  evade: 'defend',   // 회피가 방어에 유리
  defend: 'attack',  // 방어가 공격에 유리
};

export class DuelManager {
  /**
   * 일기토 발생 가능 여부 확인
   */
  static canTriggerDuel(unit1: BattleUnit, unit2: BattleUnit): boolean {
    // 같은 팀이면 불가
    if (unit1.team === unit2.team) return false;
    
    // 둘 다 살아있어야 함
    if (!unit1.isAlive || !unit2.isAlive) return false;

    return true;
  }

  /**
   * 유명 일기토 확인
   */
  static checkFamousDuel(unit1: BattleUnit, unit2: BattleUnit): FamousDuel | null {
    for (const duel of FAMOUS_DUELS) {
      const [gen1, gen2] = duel.generals;
      if (
        (unit1.generalId === gen1 && unit2.generalId === gen2) ||
        (unit1.generalId === gen2 && unit2.generalId === gen1)
      ) {
        return duel;
      }
    }
    return null;
  }

  /**
   * 랜덤 일기토 발생 여부 확인
   */
  static shouldTriggerRandomDuel(unit1: BattleUnit, unit2: BattleUnit): boolean {
    // 무력이 모두 기준 이상이어야 함
    if (
      unit1.stats.attack < DUEL_CONFIG.minPowerForRandomDuel ||
      unit2.stats.attack < DUEL_CONFIG.minPowerForRandomDuel
    ) {
      return false;
    }

    return Math.random() < DUEL_CONFIG.randomDuelChance;
  }

  /**
   * 인접 여부 확인 (맨해튼 거리 1 이내)
   */
  static areAdjacent(unit1: BattleUnit, unit2: BattleUnit): boolean {
    const rowDiff = Math.abs(unit1.position.row - unit2.position.row);
    const colDiff = Math.abs(unit1.position.col - unit2.position.col);
    return rowDiff + colDiff <= 1;
  }

  /**
   * AI 액션 선택 (무력 기반 가중치)
   */
  static selectAction(unit: BattleUnit): DuelAction {
    const attack = unit.stats.attack;
    const defense = unit.stats.defense;
    const speed = unit.stats.speed;

    const total = attack + defense + speed;
    const rand = Math.random() * total;

    if (rand < attack) return 'attack';
    if (rand < attack + defense) return 'defend';
    return 'evade';
  }

  /**
   * 라운드 결과 계산
   */
  static resolveRound(
    challengerAction: DuelAction,
    defenderAction: DuelAction,
    challengerPower: number,
    defenderPower: number
  ): { winner: 'challenger' | 'defender' | 'draw'; challengerRoll: number; defenderRoll: number } {
    // 기본 롤 (무력 + 랜덤)
    let challengerRoll = challengerPower + Math.floor(Math.random() * 20);
    let defenderRoll = defenderPower + Math.floor(Math.random() * 20);

    // 액션별 보정
    if (challengerAction === 'attack') challengerRoll *= DUEL_CONFIG.attackBonus;
    if (challengerAction === 'defend') defenderRoll *= DUEL_CONFIG.evadeFailPenalty;
    if (challengerAction === 'evade') {
      if (defenderAction === 'defend') {
        challengerRoll *= DUEL_CONFIG.evadeBonus;
      } else {
        challengerRoll *= DUEL_CONFIG.evadeFailPenalty;
      }
    }

    if (defenderAction === 'attack') defenderRoll *= DUEL_CONFIG.attackBonus;
    if (defenderAction === 'defend') challengerRoll *= DUEL_CONFIG.evadeFailPenalty;
    if (defenderAction === 'evade') {
      if (challengerAction === 'defend') {
        defenderRoll *= DUEL_CONFIG.evadeBonus;
      } else {
        defenderRoll *= DUEL_CONFIG.evadeFailPenalty;
      }
    }

    // 액션 상성 적용
    if (ACTION_ADVANTAGE[challengerAction] === defenderAction) {
      challengerRoll *= 1.2;
    }
    if (ACTION_ADVANTAGE[defenderAction] === challengerAction) {
      defenderRoll *= 1.2;
    }

    challengerRoll = Math.floor(challengerRoll);
    defenderRoll = Math.floor(defenderRoll);

    // 승자 결정 (10% 차이 이내면 무승부)
    const threshold = Math.max(challengerRoll, defenderRoll) * 0.1;
    if (Math.abs(challengerRoll - defenderRoll) <= threshold) {
      return { winner: 'draw', challengerRoll, defenderRoll };
    }

    return {
      winner: challengerRoll > defenderRoll ? 'challenger' : 'defender',
      challengerRoll,
      defenderRoll,
    };
  }

  /**
   * 일기토 실행
   */
  static executeDuel(
    challenger: BattleUnit,
    defender: BattleUnit,
    challengerActions?: DuelAction[],
    defenderActions?: DuelAction[]
  ): DuelResult {
    const famousDuel = this.checkFamousDuel(challenger, defender);
    const rounds: DuelRound[] = [];
    let challengerWins = 0;
    let defenderWins = 0;

    for (let i = 0; i < DUEL_CONFIG.maxRounds; i++) {
      const challengerAction = challengerActions?.[i] ?? this.selectAction(challenger);
      const defenderAction = defenderActions?.[i] ?? this.selectAction(defender);

      const result = this.resolveRound(
        challengerAction,
        defenderAction,
        challenger.stats.attack,
        defender.stats.attack
      );

      const round: DuelRound = {
        round: i + 1,
        challenger: { action: challengerAction, roll: result.challengerRoll },
        defender: { action: defenderAction, roll: result.defenderRoll },
        winner: result.winner,
        description: this.getRoundDescription(
          challengerAction,
          defenderAction,
          result.winner,
          challenger.name,
          defender.name
        ),
      };

      rounds.push(round);

      if (result.winner === 'challenger') challengerWins++;
      if (result.winner === 'defender') defenderWins++;
    }

    // 최종 승자 결정
    let finalWinner: 'challenger' | 'defender' | 'draw';
    if (challengerWins > defenderWins) {
      finalWinner = 'challenger';
    } else if (defenderWins > challengerWins) {
      finalWinner = 'defender';
    } else {
      finalWinner = 'draw';
    }

    // HP 변화 계산
    let challengerHpChange = 0;
    let defenderHpChange = 0;
    let expBonus = 0;

    if (finalWinner === 'challenger') {
      expBonus = DUEL_CONFIG.victoryExpBonus;
      defenderHpChange = -Math.floor(defender.stats.maxHp * DUEL_CONFIG.defeatHpPenalty);
    } else if (finalWinner === 'defender') {
      expBonus = DUEL_CONFIG.victoryExpBonus;
      challengerHpChange = -Math.floor(challenger.stats.maxHp * DUEL_CONFIG.defeatHpPenalty);
    } else {
      // 무승부: 양측 HP 20% 감소
      challengerHpChange = -Math.floor(challenger.stats.maxHp * DUEL_CONFIG.drawHpPenalty);
      defenderHpChange = -Math.floor(defender.stats.maxHp * DUEL_CONFIG.drawHpPenalty);
    }

    return {
      challenger,
      defender,
      rounds,
      finalWinner,
      challengerHpChange,
      defenderHpChange,
      expBonus,
      isFamousDuel: famousDuel !== null,
      duelName: famousDuel?.name,
    };
  }

  /**
   * 일기토 결과 적용
   */
  static applyDuelResult(result: DuelResult): void {
    const { challenger, defender, challengerHpChange, defenderHpChange } = result;

    // HP 적용
    challenger.stats.currentHp = Math.max(1, challenger.stats.currentHp + challengerHpChange);
    defender.stats.currentHp = Math.max(1, defender.stats.currentHp + defenderHpChange);

    // 패배 시 최소 HP 1로 유지 (일기토로 사망하지 않음)
    // 단, 이미 HP가 0 이하면 사망 처리
    if (challenger.stats.currentHp <= 0) {
      challenger.stats.currentHp = 1;
    }
    if (defender.stats.currentHp <= 0) {
      defender.stats.currentHp = 1;
    }
  }

  /**
   * 라운드 설명 생성
   */
  private static getRoundDescription(
    challengerAction: DuelAction,
    defenderAction: DuelAction,
    winner: 'challenger' | 'defender' | 'draw',
    challengerName: string,
    defenderName: string
  ): string {
    const actionNames: Record<DuelAction, string> = {
      attack: '공격',
      defend: '방어',
      evade: '회피',
    };

    const cAction = actionNames[challengerAction];
    const dAction = actionNames[defenderAction];

    if (winner === 'draw') {
      return `${challengerName}의 ${cAction}과 ${defenderName}의 ${dAction}이 팽팽히 맞섰다!`;
    } else if (winner === 'challenger') {
      return `${challengerName}의 ${cAction}이 ${defenderName}의 ${dAction}을 압도했다!`;
    } else {
      return `${defenderName}의 ${dAction}이 ${challengerName}의 ${cAction}을 물리쳤다!`;
    }
  }

  /**
   * 유명 일기토 목록 조회
   */
  static getFamousDuels(): FamousDuel[] {
    return [...FAMOUS_DUELS];
  }

  /**
   * 특정 장수가 참여하는 유명 일기토 목록
   */
  static getFamousDuelsForGeneral(generalId: string): FamousDuel[] {
    return FAMOUS_DUELS.filter(
      duel => duel.generals.includes(generalId)
    );
  }

  /**
   * 일기토 결과 요약 텍스트
   */
  static getDuelSummary(result: DuelResult): string {
    const winnerName =
      result.finalWinner === 'challenger'
        ? result.challenger.name
        : result.finalWinner === 'defender'
        ? result.defender.name
        : null;

    let summary = result.isFamousDuel
      ? `⚔️ 유명 일기토: ${result.duelName}!\n`
      : `⚔️ 일기토: ${result.challenger.name} vs ${result.defender.name}\n`;

    summary += `결과: ${winnerName ? `${winnerName} 승리!` : '무승부'}\n`;
    
    if (result.expBonus > 0) {
      summary += `🎁 경험치 보너스: +${result.expBonus}`;
    }

    return summary;
  }
}
