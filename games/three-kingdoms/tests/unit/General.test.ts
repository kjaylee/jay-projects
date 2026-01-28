import { describe, it, expect } from 'vitest';
import { General, GeneralGrade, GeneralClass, Faction } from '../../src/entities/General';
import { GeneralStats } from '../../src/entities/GeneralStats';

describe('General', () => {
  describe('생성', () => {
    it('장수 기본 생성', () => {
      const general = new General({
        id: 'guan-yu',
        name: '관우',
        grade: 'SSR',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 95, defense: 80, intelligence: 70, speed: 75, politics: 60 },
      });

      expect(general.id).toBe('guan-yu');
      expect(general.name).toBe('관우');
      expect(general.grade).toBe('SSR');
      expect(general.generalClass).toBe('warrior');
      expect(general.faction).toBe('shu');
      expect(general.level).toBe(1);
      expect(general.stars).toBe(1);
    });

    it('장수 레벨/별 지정 생성', () => {
      const general = new General({
        id: 'zhang-fei',
        name: '장비',
        grade: 'SSR',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 98, defense: 70, intelligence: 30, speed: 80, politics: 20 },
        level: 50,
        stars: 3,
      });

      expect(general.level).toBe(50);
      expect(general.stars).toBe(3);
    });
  });

  describe('스탯 계산', () => {
    it('레벨업 시 스탯 증가 (base * (1 + level * 0.1))', () => {
      const general = new General({
        id: 'zhao-yun',
        name: '조운',
        grade: 'SSR',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 90, defense: 85, intelligence: 65, speed: 88, politics: 50 },
        level: 10,
      });

      const stats = general.calculateStats();
      // attack: 90 * (1 + 10 * 0.1) = 90 * 2 = 180
      expect(stats.attack).toBe(180);
      expect(stats.defense).toBe(170); // 85 * 2
    });

    it('승급(별) 시 스탯 보너스 (+10% per star above 1)', () => {
      const general = new General({
        id: 'lu-bu',
        name: '여포',
        grade: 'UR',
        generalClass: 'warrior',
        faction: 'neutral',
        baseStats: { attack: 100, defense: 75, intelligence: 40, speed: 95, politics: 15 },
        level: 1,
        stars: 5,
      });

      const stats = general.calculateStats();
      // base: 100, level 1: 100 * 1.1 = 110, stars 5: 110 * (1 + 0.4) = 154
      // 1성 기본, 2~5성 각 +10%씩 = +40%
      expect(stats.attack).toBe(154);
    });
  });

  describe('레벨업', () => {
    it('레벨업 성공', () => {
      const general = new General({
        id: 'test',
        name: '테스트',
        grade: 'N',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 50, defense: 50, intelligence: 50, speed: 50, politics: 50 },
      });

      general.levelUp();
      expect(general.level).toBe(2);
    });

    it('최대 레벨 제한 (100)', () => {
      const general = new General({
        id: 'test',
        name: '테스트',
        grade: 'N',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 50, defense: 50, intelligence: 50, speed: 50, politics: 50 },
        level: 100,
      });

      general.levelUp();
      expect(general.level).toBe(100);
    });
  });

  describe('승급', () => {
    it('승급 성공', () => {
      const general = new General({
        id: 'test',
        name: '테스트',
        grade: 'N',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 50, defense: 50, intelligence: 50, speed: 50, politics: 50 },
        stars: 1,
      });

      general.upgrade();
      expect(general.stars).toBe(2);
    });

    it('최대 별 제한 (5)', () => {
      const general = new General({
        id: 'test',
        name: '테스트',
        grade: 'N',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 50, defense: 50, intelligence: 50, speed: 50, politics: 50 },
        stars: 5,
      });

      general.upgrade();
      expect(general.stars).toBe(5);
    });
  });

  describe('등급별 기본 스탯 범위', () => {
    it('UR 등급 기본 공격력 90+', () => {
      const lubu = new General({
        id: 'lu-bu',
        name: '여포',
        grade: 'UR',
        generalClass: 'warrior',
        faction: 'neutral',
        baseStats: { attack: 100, defense: 75, intelligence: 40, speed: 95, politics: 15 },
      });
      expect(lubu.baseStats.attack).toBeGreaterThanOrEqual(90);
    });

    it('N 등급 기본 공격력 60 이하', () => {
      const soldier = new General({
        id: 'soldier-1',
        name: '일반병',
        grade: 'N',
        generalClass: 'warrior',
        faction: 'neutral',
        baseStats: { attack: 40, defense: 40, intelligence: 30, speed: 35, politics: 20 },
      });
      expect(soldier.baseStats.attack).toBeLessThanOrEqual(60);
    });
  });
});

describe('GeneralStats', () => {
  it('스탯 객체 생성', () => {
    const stats = new GeneralStats(100, 80, 70, 75, 60);
    expect(stats.attack).toBe(100);
    expect(stats.defense).toBe(80);
    expect(stats.intelligence).toBe(70);
    expect(stats.speed).toBe(75);
    expect(stats.politics).toBe(60);
  });

  it('전투력 계산 (attack + defense + intelligence + speed)', () => {
    const stats = new GeneralStats(100, 80, 70, 75, 60);
    expect(stats.combatPower).toBe(325); // 100+80+70+75
  });

  it('버프 적용', () => {
    const stats = new GeneralStats(100, 80, 70, 75, 60);
    const buffed = stats.applyBuff({ attack: 50, defense: 20 });
    expect(buffed.attack).toBe(150);
    expect(buffed.defense).toBe(100);
    expect(buffed.intelligence).toBe(70); // 버프 없음
  });

  it('디버프 적용 (최소 0)', () => {
    const stats = new GeneralStats(100, 80, 70, 75, 60);
    const debuffed = stats.applyBuff({ attack: -150 });
    expect(debuffed.attack).toBe(0); // 마이너스 안됨
  });
});
