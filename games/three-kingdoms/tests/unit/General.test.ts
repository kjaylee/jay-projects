import { describe, it, expect } from 'vitest';
import { General, GeneralGrade, GeneralClass, Faction } from '../../src/entities/General';
import { GeneralStats } from '../../src/entities/GeneralStats';
import { Equipment } from '../../src/entities/Equipment';
import { Skill } from '../../src/entities/Skill';

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

describe('General 장비 시스템', () => {
  const createTestGeneral = () => new General({
    id: 'guan-yu',
    name: '관우',
    grade: 'SSR',
    generalClass: 'warrior',
    faction: 'shu',
    baseStats: { attack: 95, defense: 80, intelligence: 70, speed: 75, politics: 60 },
  });

  const createTestWeapon = () => new Equipment({
    id: 'qinglong-yanyue',
    name: '청룡언월도',
    slot: 'weapon',
    grade: 'legendary',
    stats: { attack: 50, speed: 10 },
  });

  const createTestArmor = () => new Equipment({
    id: 'dragon-armor',
    name: '용린갑',
    slot: 'armor',
    grade: 'epic',
    stats: { defense: 40, hp: 100 },
  });

  const createTestAccessory = () => new Equipment({
    id: 'jade-ring',
    name: '옥반지',
    slot: 'accessory',
    grade: 'rare',
    stats: { intelligence: 20, politics: 15 },
  });

  describe('equipItem', () => {
    it('무기를 장착한다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon();

      const result = general.equipItem(weapon);

      expect(result).toBe(true);
      expect(general.getEquippedItem('weapon')).toBe(weapon);
    });

    it('방어구를 장착한다', () => {
      const general = createTestGeneral();
      const armor = createTestArmor();

      const result = general.equipItem(armor);

      expect(result).toBe(true);
      expect(general.getEquippedItem('armor')).toBe(armor);
    });

    it('장신구를 장착한다', () => {
      const general = createTestGeneral();
      const accessory = createTestAccessory();

      const result = general.equipItem(accessory);

      expect(result).toBe(true);
      expect(general.getEquippedItem('accessory')).toBe(accessory);
    });

    it('기존 장비를 교체하고 이전 장비를 반환한다', () => {
      const general = createTestGeneral();
      const weapon1 = createTestWeapon();
      const weapon2 = new Equipment({
        id: 'iron-sword',
        name: '철검',
        slot: 'weapon',
        grade: 'common',
        stats: { attack: 10 },
      });

      general.equipItem(weapon1);
      const previousWeapon = general.equipItem(weapon2);

      expect(previousWeapon).toBe(weapon1);
      expect(general.getEquippedItem('weapon')).toBe(weapon2);
    });

    it('모든 슬롯(weapon, armor, accessory, horse)에 장착 가능', () => {
      const general = createTestGeneral();
      const horse = new Equipment({
        id: 'red-hare',
        name: '적토마',
        slot: 'horse',
        grade: 'legendary',
        stats: { speed: 30 },
      });

      general.equipItem(horse);

      expect(general.getEquippedItem('horse')).toBe(horse);
    });
  });

  describe('unequipItem', () => {
    it('장착된 장비를 해제한다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon();
      general.equipItem(weapon);

      const unequipped = general.unequipItem('weapon');

      expect(unequipped).toBe(weapon);
      expect(general.getEquippedItem('weapon')).toBeNull();
    });

    it('장착되지 않은 슬롯 해제 시 null 반환', () => {
      const general = createTestGeneral();

      const result = general.unequipItem('weapon');

      expect(result).toBeNull();
    });
  });

  describe('calculateStats with Equipment', () => {
    it('장비 스탯이 최종 스탯에 반영된다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon(); // attack: 50, speed: 10

      const baseStats = general.calculateStats();
      general.equipItem(weapon);
      const equippedStats = general.calculateStats();

      // 레벨 1 기본 계산: 95 * 1.1 = 104.5 -> 104
      expect(equippedStats.attack).toBe(baseStats.attack + 50);
      expect(equippedStats.speed).toBe(baseStats.speed + 10);
    });

    it('여러 장비의 스탯이 합산된다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon();   // attack: 50, speed: 10
      const armor = createTestArmor();     // defense: 40
      const accessory = createTestAccessory(); // intelligence: 20, politics: 15

      const baseStats = general.calculateStats();
      general.equipItem(weapon);
      general.equipItem(armor);
      general.equipItem(accessory);
      const equippedStats = general.calculateStats();

      expect(equippedStats.attack).toBe(baseStats.attack + 50);
      expect(equippedStats.defense).toBe(baseStats.defense + 40);
      expect(equippedStats.intelligence).toBe(baseStats.intelligence + 20);
      expect(equippedStats.speed).toBe(baseStats.speed + 10);
      expect(equippedStats.politics).toBe(baseStats.politics + 15);
    });

    it('강화된 장비의 보너스가 적용된다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon(); // attack: 50
      weapon.enhance(); // +5% = 52.5 -> 52
      weapon.enhance(); // +10% = 55
      weapon.enhance(); // +15% = 57.5 -> 57

      const baseStats = general.calculateStats();
      general.equipItem(weapon);
      const equippedStats = general.calculateStats();

      // 강화 3레벨: 50 * 1.15 = 57.5 -> 57
      expect(equippedStats.attack).toBe(baseStats.attack + 57);
    });
  });

  describe('getAllEquipment', () => {
    it('장착된 모든 장비 목록을 반환한다', () => {
      const general = createTestGeneral();
      const weapon = createTestWeapon();
      const armor = createTestArmor();

      general.equipItem(weapon);
      general.equipItem(armor);

      const equipped = general.getAllEquipment();
      expect(equipped).toHaveLength(2);
      expect(equipped).toContain(weapon);
      expect(equipped).toContain(armor);
    });

    it('장비가 없으면 빈 배열 반환', () => {
      const general = createTestGeneral();
      expect(general.getAllEquipment()).toHaveLength(0);
    });
  });
});

describe('General 스킬 시스템', () => {
  const createTestGeneral = (skillIds: string[] = []) => new General({
    id: 'zhuge-liang',
    name: '제갈량',
    grade: 'UR',
    generalClass: 'strategist',
    faction: 'shu',
    baseStats: { attack: 40, defense: 50, intelligence: 100, speed: 65, politics: 98 },
    skillIds,
  });

  const testSkillData: Record<string, Skill> = {
    'fire-attack': new Skill({
      id: 'fire-attack',
      name: '화공',
      type: 'active',
      target: 'enemy_all',
      effects: [{ type: 'damage', value: 120 }],
      cooldown: 3,
      description: '모든 적에게 지력 기반 120% 피해',
    }),
    'wind-blessing': new Skill({
      id: 'wind-blessing',
      name: '축풍',
      type: 'active',
      target: 'ally_all',
      effects: [{ type: 'buff', value: 20, attribute: 'speed', duration: 2 }],
      cooldown: 4,
      description: '모든 아군 속도 +20% (2턴)',
    }),
    'tactics-master': new Skill({
      id: 'tactics-master',
      name: '천재군사',
      type: 'passive',
      target: 'self',
      effects: [{ type: 'buff', value: 10, attribute: 'intelligence' }],
      description: '지력 +10%',
    }),
  };

  describe('loadSkills', () => {
    it('skillIds로 스킬 객체를 로드한다', () => {
      const general = createTestGeneral(['fire-attack', 'wind-blessing']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;

      general.loadSkills(skillLoader);

      expect(general.skills).toHaveLength(2);
      expect(general.skills[0].name).toBe('화공');
      expect(general.skills[1].name).toBe('축풍');
    });

    it('빈 skillIds면 빈 배열', () => {
      const general = createTestGeneral([]);
      const skillLoader = (id: string) => testSkillData[id] ?? null;

      general.loadSkills(skillLoader);

      expect(general.skills).toHaveLength(0);
    });

    it('존재하지 않는 스킬 ID는 무시한다', () => {
      const general = createTestGeneral(['fire-attack', 'non-existent', 'wind-blessing']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;

      general.loadSkills(skillLoader);

      expect(general.skills).toHaveLength(2);
    });

    it('각성 스킬도 로드한다 (각성 상태일 때)', () => {
      const general = new General({
        id: 'zhuge-liang',
        name: '제갈량',
        grade: 'UR',
        generalClass: 'strategist',
        faction: 'shu',
        baseStats: { attack: 40, defense: 50, intelligence: 100, speed: 65, politics: 98 },
        skillIds: ['fire-attack'],
        level: 100,
        stars: 5,
        awakened: true,
        awakenData: {
          awakenStats: { intelligence: 50 },
          awakenSkillId: 'tactics-master',
          awakenCost: { gold: 100000, awakenStones: 50 },
        },
      });
      const skillLoader = (id: string) => testSkillData[id] ?? null;

      general.loadSkills(skillLoader);

      expect(general.skills).toHaveLength(2);
      expect(general.skills.some(s => s.id === 'tactics-master')).toBe(true);
    });
  });

  describe('getSkill', () => {
    it('로드된 스킬을 ID로 조회한다', () => {
      const general = createTestGeneral(['fire-attack', 'wind-blessing']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;
      general.loadSkills(skillLoader);

      const skill = general.getSkill('fire-attack');

      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('화공');
    });

    it('로드되지 않은 스킬 조회 시 null', () => {
      const general = createTestGeneral(['fire-attack']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;
      general.loadSkills(skillLoader);

      const skill = general.getSkill('wind-blessing');

      expect(skill).toBeNull();
    });
  });

  describe('getActiveSkills / getPassiveSkills', () => {
    it('액티브 스킬만 반환', () => {
      const general = createTestGeneral(['fire-attack', 'wind-blessing', 'tactics-master']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;
      general.loadSkills(skillLoader);

      const activeSkills = general.getActiveSkills();

      expect(activeSkills).toHaveLength(2);
      expect(activeSkills.every(s => s.type === 'active')).toBe(true);
    });

    it('패시브 스킬만 반환', () => {
      const general = createTestGeneral(['fire-attack', 'wind-blessing', 'tactics-master']);
      const skillLoader = (id: string) => testSkillData[id] ?? null;
      general.loadSkills(skillLoader);

      const passiveSkills = general.getPassiveSkills();

      expect(passiveSkills).toHaveLength(1);
      expect(passiveSkills[0].name).toBe('천재군사');
    });
  });
});
