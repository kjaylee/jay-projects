import { describe, it, expect, beforeEach } from 'vitest';
import { Formation } from '../../src/entities/Formation';
import { FormationManager } from '../../src/managers/FormationManager';
import { OwnedGeneralsManager } from '../../src/managers/OwnedGeneralsManager';
import generalsData from '../../src/data/generals.json';

/**
 * 전투력 계산 로직 (MainScene.calculatePower와 동일)
 * 전투력 = Σ (attack + defense + intelligence + speed) × 등급배수 × 레벨배수
 */
function calculatePower(userId: string): number {
  const formationManager = FormationManager.load(userId);
  const activeFormation = formationManager.getActiveFormation();
  const ownedGenerals = new OwnedGeneralsManager(userId);
  const unitIds = activeFormation.getAllUnits();

  if (unitIds.length === 0) return 0;

  const gradeMultiplier: Record<string, number> = {
    N: 1.0, R: 1.2, SR: 1.5, SSR: 1.8, UR: 2.2,
  };

  let totalPower = 0;

  for (const generalId of unitIds) {
    const general = (generalsData.generals as Array<{
      id: string;
      grade: string;
      baseStats: { attack: number; defense: number; intelligence: number; speed: number };
    }>).find(g => g.id === generalId);

    if (!general) continue;

    const { attack, defense, intelligence, speed } = general.baseStats;
    const statSum = attack + defense + intelligence + speed;
    const gradeMult = gradeMultiplier[general.grade] ?? 1.0;
    const level = ownedGenerals.getGeneralLevel(generalId);
    const levelMult = 1 + (level - 1) * 0.1;

    totalPower += Math.floor(statSum * gradeMult * levelMult);
  }

  return totalPower;
}

describe('전투력 계산', () => {
  const userId = 'test_power_calc';

  beforeEach(() => {
    localStorage.clear();
  });

  it('빈 진형 → 전투력 0', () => {
    expect(calculatePower(userId)).toBe(0);
  });

  it('단일 장수 전투력 (관우 SR, Lv1)', () => {
    // 관우: attack 97, defense 85, intelligence 75, speed 80 → sum 337
    // SR grade multiplier: 1.5
    // Level 1 multiplier: 1.0
    // Power = floor(337 * 1.5 * 1.0) = 505
    const fm = new FormationManager(userId);
    fm.getActiveFormation().placeUnit('guan_yu', 0, 1);
    fm.save();

    const owned = new OwnedGeneralsManager(userId);
    owned.acquireGeneral('guan_yu', 'SR');

    expect(calculatePower(userId)).toBe(505);
  });

  it('레벨 증가에 따른 전투력 상승', () => {
    const fm = new FormationManager(userId);
    fm.getActiveFormation().placeUnit('guan_yu', 0, 1);
    fm.save();

    const owned = new OwnedGeneralsManager(userId);
    owned.acquireGeneral('guan_yu', 'SR');

    const powerLv1 = calculatePower(userId);

    // 레벨업 (100 EXP → Lv2)
    owned.addExp('guan_yu', 100);

    const powerLv2 = calculatePower(userId);
    // Level 2 multiplier: 1.1
    // Power = floor(337 * 1.5 * 1.1) = 556
    expect(powerLv2).toBe(556);
    expect(powerLv2).toBeGreaterThan(powerLv1);
  });

  it('다수 장수 전투력 합산', () => {
    const fm = new FormationManager(userId);
    fm.getActiveFormation().placeUnit('guan_yu', 0, 1);   // SR
    fm.getActiveFormation().placeUnit('zhang_fei', 0, 0);  // SR
    fm.save();

    const owned = new OwnedGeneralsManager(userId);
    owned.acquireGeneral('guan_yu', 'SR');
    owned.acquireGeneral('zhang_fei', 'SR');

    const power = calculatePower(userId);
    // 두 장수의 전투력 합이므로 0보다 크고 합리적인 범위
    expect(power).toBeGreaterThan(500);
  });

  it('높은 등급 장수가 더 높은 전투력', () => {
    // SSR 장수 테스트 (제갈량)
    const fm1 = new FormationManager('user_ssr');
    fm1.getActiveFormation().placeUnit('zhuge_liang', 0, 1); // SSR
    fm1.save();
    const owned1 = new OwnedGeneralsManager('user_ssr');
    owned1.acquireGeneral('zhuge_liang', 'SSR');
    const ssrPower = calculatePower('user_ssr');

    // N등급 장수 테스트
    const fm2 = new FormationManager('user_n');
    fm2.getActiveFormation().placeUnit('zhang_song', 0, 1); // N
    fm2.save();
    const owned2 = new OwnedGeneralsManager('user_n');
    owned2.acquireGeneral('zhang_song', 'N');
    const nPower = calculatePower('user_n');

    expect(ssrPower).toBeGreaterThan(nPower);
  });

  it('존재하지 않는 장수 ID는 무시', () => {
    const fm = new FormationManager(userId);
    fm.getActiveFormation().placeUnit('nonexistent', 0, 0);
    fm.getActiveFormation().placeUnit('guan_yu', 0, 1);
    fm.save();

    const owned = new OwnedGeneralsManager(userId);
    owned.acquireGeneral('guan_yu', 'SR');

    const power = calculatePower(userId);
    // nonexistent는 무시되고 관우만 계산
    expect(power).toBe(505);
  });
});
