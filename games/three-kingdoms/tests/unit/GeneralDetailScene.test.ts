import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneralDetailManager, GeneralData } from '../../src/managers/GeneralDetailManager';

describe('GeneralDetailManager', () => {
  let manager: GeneralDetailManager;

  beforeEach(() => {
    manager = new GeneralDetailManager();
  });

  describe('장수 정보 조회', () => {
    it('장수 ID로 정보를 조회할 수 있다', () => {
      const general = manager.getGeneral('guan-yu');
      expect(general).toBeDefined();
      expect(general!.name).toBe('관우');
      expect(general!.rarity).toBe('SSR');
      expect(general!.level).toBe(30);
    });

    it('존재하지 않는 장수는 undefined 반환', () => {
      const general = manager.getGeneral('non-existent');
      expect(general).toBeUndefined();
    });

    it('장수 기본 스탯이 포함된다', () => {
      const general = manager.getGeneral('guan-yu');
      expect(general!.stats.attack).toBe(250);
      expect(general!.stats.defense).toBe(180);
      expect(general!.stats.hp).toBe(3000);
    });

    it('장수 스킬 ID 목록이 포함된다', () => {
      const general = manager.getGeneral('guan-yu');
      expect(general!.skillIds).toContain('green-dragon');
      expect(general!.skillIds).toContain('loyalty');
    });
  });

  describe('최종 스탯 계산', () => {
    it('장비 없이 기본 스탯 반환', () => {
      const stats = manager.calculateFinalStats('guan-yu');
      expect(stats!.attack).toBe(250);
      expect(stats!.defense).toBe(180);
    });

    it('장비 장착 시 스탯에 반영', () => {
      manager.equipItem('guan-yu', 'green-dragon-blade');
      const stats = manager.calculateFinalStats('guan-yu');
      expect(stats!.attack).toBe(350); // 250 + 100
      expect(stats!.speed).toBe(110);  // 100 + 10
    });

    it('여러 장비 동시 적용', () => {
      manager.equipItem('guan-yu', 'green-dragon-blade');
      manager.equipItem('guan-yu', 'tiger-armor');
      manager.equipItem('guan-yu', 'jade-ring');
      
      const stats = manager.calculateFinalStats('guan-yu');
      expect(stats!.attack).toBe(350);      // 250 + 100
      expect(stats!.defense).toBe(260);     // 180 + 80
      expect(stats!.intelligence).toBe(150); // 120 + 30
      expect(stats!.speed).toBe(130);       // 100 + 10 + 20
      expect(stats!.hp).toBe(3500);         // 3000 + 500
    });

    it('존재하지 않는 장수 → null', () => {
      const stats = manager.calculateFinalStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('레벨업', () => {
    it('레벨업 시 스탯이 증가한다', () => {
      const before = manager.getGeneral('guan-yu')!.stats.attack;
      const result = manager.levelUp('guan-yu', 1);
      
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(31);
      expect(result.statChanges.attack).toBe(8); // SSR 성장률
      
      const after = manager.getGeneral('guan-yu')!.stats.attack;
      expect(after).toBe(before + 8);
    });

    it('다중 레벨업 가능', () => {
      manager.setGold(100000); // 충분한 금화 설정
      manager.setExpMaterial(10000); // 충분한 경험치 재료 설정
      const result = manager.levelUp('guan-yu', 5);
      
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(35);
      expect(result.statChanges.attack).toBe(40); // 8 * 5
    });

    it('최대 레벨 초과 불가', () => {
      manager.setGold(1000000); // 충분한 금화 설정
      manager.setExpMaterial(100000); // 충분한 경험치 재료 설정
      const general = manager.getGeneral('guan-yu')!;
      general.level = 58; // maxLevel은 60
      
      const result = manager.levelUp('guan-yu', 5);
      
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(60);
    });

    it('이미 최대 레벨이면 실패', () => {
      const general = manager.getGeneral('guan-yu')!;
      general.level = 60;
      
      const result = manager.levelUp('guan-yu', 1);
      
      expect(result.success).toBe(false);
    });

    it('금화 부족 시 실패', () => {
      manager.setGold(0);
      const result = manager.levelUp('guan-yu', 1);
      
      expect(result.success).toBe(false);
      expect(result.goldCost).toBeGreaterThan(0);
    });

    it('경험치 재료 부족 시 실패', () => {
      manager.setExpMaterial(0);
      const result = manager.levelUp('guan-yu', 1);
      
      expect(result.success).toBe(false);
    });

    it('레벨업 비용이 차감된다', () => {
      const beforeGold = manager.getGold();
      const beforeExp = manager.getExpMaterial();
      
      const result = manager.levelUp('guan-yu', 1);
      
      expect(manager.getGold()).toBe(beforeGold - result.goldCost);
      expect(manager.getExpMaterial()).toBe(beforeExp - result.expMaterialCost);
    });

    it('존재하지 않는 장수 레벨업 실패', () => {
      const result = manager.levelUp('non-existent', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('장비 장착', () => {
    it('무기를 장착할 수 있다', () => {
      const result = manager.equipItem('guan-yu', 'green-dragon-blade');
      
      expect(result.success).toBe(true);
      expect(result.slot).toBe('weapon');
      expect(result.newEquipmentId).toBe('green-dragon-blade');
      expect(result.statChanges.attack).toBe(100);
    });

    it('방어구를 장착할 수 있다', () => {
      const result = manager.equipItem('guan-yu', 'tiger-armor');
      
      expect(result.success).toBe(true);
      expect(result.slot).toBe('armor');
      expect(result.statChanges.defense).toBe(80);
      expect(result.statChanges.hp).toBe(500);
    });

    it('장신구를 장착할 수 있다', () => {
      const result = manager.equipItem('guan-yu', 'jade-ring');
      
      expect(result.success).toBe(true);
      expect(result.slot).toBe('accessory');
    });

    it('장비 교체 시 이전 장비 ID 반환', () => {
      manager.equipItem('guan-yu', 'green-dragon-blade');
      
      // 새 장비 등록
      (manager as any).equipments.set('iron-sword', {
        id: 'iron-sword',
        name: '철검',
        type: 'weapon',
        rarity: 'R',
        stats: { attack: 30 },
      });
      
      const result = manager.equipItem('guan-yu', 'iron-sword');
      
      expect(result.previousEquipmentId).toBe('green-dragon-blade');
      expect(result.statChanges.attack).toBe(-70); // 30 - 100
    });

    it('존재하지 않는 장수 → 실패', () => {
      const result = manager.equipItem('non-existent', 'green-dragon-blade');
      expect(result.success).toBe(false);
    });

    it('존재하지 않는 장비 → 실패', () => {
      const result = manager.equipItem('guan-yu', 'non-existent');
      expect(result.success).toBe(false);
    });
  });

  describe('장비 해제', () => {
    beforeEach(() => {
      manager.equipItem('guan-yu', 'green-dragon-blade');
    });

    it('장착된 장비를 해제할 수 있다', () => {
      const result = manager.unequipItem('guan-yu', 'weapon');
      
      expect(result.success).toBe(true);
      expect(result.previousEquipmentId).toBe('green-dragon-blade');
      expect(result.statChanges.attack).toBe(-100);
    });

    it('빈 슬롯 해제 시 실패', () => {
      const result = manager.unequipItem('guan-yu', 'armor');
      expect(result.success).toBe(false);
    });

    it('해제 후 슬롯이 비어있음', () => {
      manager.unequipItem('guan-yu', 'weapon');
      const general = manager.getGeneral('guan-yu');
      expect(general!.equipmentSlots.weapon).toBeNull();
    });
  });

  describe('장비 목록', () => {
    it('모든 장비를 조회할 수 있다', () => {
      const equips = manager.getAvailableEquipments();
      expect(equips.length).toBe(3);
    });

    it('슬롯별로 필터링할 수 있다', () => {
      const weapons = manager.getAvailableEquipments('weapon');
      expect(weapons.length).toBe(1);
      expect(weapons[0].name).toBe('청룡언월도');
      
      const armors = manager.getAvailableEquipments('armor');
      expect(armors.length).toBe(1);
      expect(armors[0].name).toBe('호표갑');
    });
  });

  describe('레어리티별 성장률', () => {
    it('N등급 장수 성장률', () => {
      manager.addGeneral({
        id: 'soldier',
        name: '병사',
        rarity: 'N',
        level: 1,
        maxLevel: 30,
        exp: 0,
        expToNextLevel: 100,
        stars: 1,
        maxStars: 3,
        class: 'warrior',
        stats: { attack: 10, defense: 10, intelligence: 5, speed: 5, hp: 100, maxHp: 100 },
        skillIds: [],
        equipmentSlots: { weapon: null, armor: null, accessory: null },
      });

      const result = manager.levelUp('soldier', 1);
      expect(result.statChanges.attack).toBe(2);
      expect(result.statChanges.hp).toBe(20);
    });

    it('UR등급 장수 성장률', () => {
      manager.addGeneral({
        id: 'lu-bu',
        name: '여포',
        rarity: 'UR',
        level: 1,
        maxLevel: 80,
        exp: 0,
        expToNextLevel: 200,
        stars: 1,
        maxStars: 7,
        class: 'warrior',
        stats: { attack: 50, defense: 30, intelligence: 20, speed: 30, hp: 500, maxHp: 500 },
        skillIds: ['sky-piercing'],
        equipmentSlots: { weapon: null, armor: null, accessory: null },
      });

      const result = manager.levelUp('lu-bu', 1);
      expect(result.statChanges.attack).toBe(12);
      expect(result.statChanges.hp).toBe(120);
    });
  });
});
