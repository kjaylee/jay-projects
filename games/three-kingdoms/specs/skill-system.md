# 계략/스킬 시스템 스펙 (Skill System)

## 1. 현재 구현 상태

### ✅ 완료된 기능

#### Skill 클래스 (`src/entities/Skill.ts`)
- **기본 속성**
  - `id`, `name`, `type` (active/passive)
  - `target`: 타겟 유형
  - `effects[]`: 효과 배열
  - `cooldown`, `mpCost`, `description`

- **스킬 타입 (SkillType)**
  - `active`: 액티브 스킬 (쿨다운, MP 소모)
  - `passive`: 패시브 스킬 (항상 발동, 쿨다운/MP 없음)

- **타겟 유형 (SkillTarget)**
  - `self`: 자신
  - `ally_single`, `ally_all`, `ally_row`: 아군 단일/전체/횡렬
  - `enemy_single`, `enemy_all`, `enemy_row`, `enemy_column`: 적 단일/전체/횡렬/종렬

- **효과 유형 (SkillEffect)**
  - `damage`: 데미지 (value=퍼센트, attribute=공격력/지력)
  - `heal`: 회복 (value=퍼센트)
  - `buff`: 버프 (attribute, duration)
  - `debuff`: 디버프 (attribute, duration)

#### 타겟 판정
- `isSingleTarget()`: 단일 대상 여부
- `isAoE()`: 범위 스킬 여부
- `isEnemyTarget()`: 적 대상 여부
- `isAllyTarget()`: 아군 대상 여부

#### 효과 판정
- `hasDamage()`: 데미지 효과 포함 여부
- `hasHeal()`: 회복 효과 포함 여부
- `hasBuff()`: 버프 효과 포함 여부
- `hasDebuff()`: 디버프 효과 포함 여부

#### 쿨다운 관리
- `use()`: 스킬 사용 (쿨다운 설정)
- `reduceCooldown(amount)`: 쿨다운 감소
- `isReady()`: 사용 가능 여부
- `resetCooldown()`: 쿨다운 초기화

#### 데미지/회복 계산
- `calculateDamage(statValue)`: `statValue * (value / 100)`
- `calculateHeal(statValue)`: `statValue * (value / 100)`

#### 직렬화
- `toJSON()` / `fromJSON()` 지원

### 🧪 테스트 커버리지 (`tests/unit/Skill.test.ts`)
- [x] 공격 스킬 생성
- [x] 패시브 스킬 생성 (쿨다운/MP 0)
- [x] 단일 대상 판정
- [x] 범위 대상 판정 (전체/횡렬/종렬)
- [x] 효과 유형 판정 (데미지/회복/버프/디버프)
- [x] 복합 효과 (데미지 + 디버프)
- [x] 쿨다운 감소 및 사용 가능 여부
- [x] 데미지 계산 (퍼센트 배율)

---

## 2. 남은 요구사항

### ❌ 미구현 기능

| 기능 | 기획서 요구사항 | 상태 |
|------|----------------|------|
| **전투 연동** | 실제 전투에서 스킬 발동 | ✅ 완료 |
| **게이지 시스템** | 충전 시 계략 발동 | 미구현 |
| **버프/디버프 적용** | 지속 효과 실제 적용 | ✅ 완료 (BuffManager) |
| **스킬 데이터** | 화계, 수계, 낙석 등 | ✅ 완료 (skills.json) |
| **스킬 레벨업** | 스킬 강화 시스템 | 미구현 |
| **연환계** | 다음 계략 쿨타임 초기화 | 미구현 |
| **스킬 연출** | 이펙트, 애니메이션 | ✅ 완료 (SkillEffectManager) |

### 📋 기획서 계략 시스템

| 계략 | 타입 | 효과 |
|------|------|------|
| 🔥 **화계** | 공격 | 적 전체 지력 비례 데미지 |
| 🌊 **수계** | 공격 | 적 종렬 관통 데미지 |
| 🪨 **낙석** | 공격 | 적 단일 고정 데미지 + 스턴 |
| 🎭 **혼란** | 디버프 | 적 2턴 공격력 50% 감소 |
| 🏹 **매복** | 특수 | 선제 기습 (첫 턴 2배 데미지) |
| 💚 **치료** | 회복 | 아군 전체 HP 30% 회복 |
| 🛡️ **철벽** | 버프 | 아군 전열 방어력 50% 증가 |
| ⚡ **연환계** | 연계 | 다음 계략 쿨타임 초기화 |

### 미구현 효과 유형
- **스턴**: 행동 불가 (duration)
- **선제 기습**: 첫 턴 특수 효과
- **쿨다운 초기화**: 특정 스킬 즉시 사용 가능

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-SKL-01: 스킬 생성
```
GIVEN 스킬 설정(id, name, type, target, effects)이 주어졌을 때
WHEN 새 스킬을 생성하면
THEN 해당 속성을 가진 스킬이 생성된다
```
**상태: ✅ 완료**

### AC-SKL-02: 쿨다운 관리
```
GIVEN 쿨다운 3인 스킬이 있을 때
WHEN 스킬을 사용하면
THEN 쿨다운이 3으로 설정되고 isReady()가 false가 된다
```
**상태: ✅ 완료**

### AC-SKL-03: 데미지 계산
```
GIVEN value=150인 데미지 스킬이 있을 때
WHEN calculateDamage(100)을 호출하면
THEN 150 (100 * 1.5)이 반환된다
```
**상태: ✅ 완료**

### AC-SKL-04: 전투 중 발동
```
GIVEN 장수가 스킬을 보유하고 있을 때
WHEN 전투 중 쿨다운이 0이고 게이지가 충분하면
THEN 스킬이 자동으로 발동된다
```
**상태: ✅ 완료** (SkillExecutor.executeSkill + BattleManager 연동)

### AC-SKL-05: 타겟 선택
```
GIVEN target=enemy_row인 스킬이 있을 때
WHEN 스킬이 발동되면
THEN 지정된 행의 모든 적에게 효과가 적용된다
```
**상태: ✅ 완료** (SkillExecutor.selectTargets)

### AC-SKL-06: 버프 적용
```
GIVEN buff 효과가 있는 스킬이 있을 때
WHEN 스킬이 발동되면
THEN 대상의 스탯이 duration 턴 동안 증가한다
```
**상태: ✅ 완료** (BuffManager + SkillExecutor 연동)

### AC-SKL-07: 디버프 적용
```
GIVEN debuff 효과가 있는 스킬이 있을 때
WHEN 스킬이 발동되면
THEN 대상의 스탯이 duration 턴 동안 감소한다
```
**상태: ✅ 완료** (BuffManager + SkillExecutor 연동)

### AC-SKL-08: 스킬 연출
```
GIVEN 스킬이 발동되었을 때
WHEN 화면에 표시되면
THEN 스킬 이름과 이펙트 애니메이션이 재생된다
```
**상태: ✅ 완료** (SkillEffectManager)

### AC-SKL-09: 스킬 레벨업
```
GIVEN 레벨업 재료가 충분할 때
WHEN 스킬을 강화하면
THEN 스킬 효과가 증가한다
```
**상태: ❌ 미구현**

### AC-SKL-10: 연환계 (쿨다운 초기화)
```
GIVEN 연환계 스킬이 발동되었을 때
WHEN 효과가 적용되면
THEN 지정된 스킬의 쿨다운이 0으로 초기화된다
```
**상태: ❌ 미구현**

---

## 4. 다음 구현 우선순위

1. ~~**스킬 데이터** - 기획서의 8개 계략 JSON 정의~~ ✅ 완료
2. ~~**전투 연동** - BattleManager에서 스킬 발동 로직~~ ✅ 완료
3. **게이지 시스템** - MP/게이지 충전 및 소모
4. ~~**버프/디버프 매니저** - 지속 효과 적용 및 턴 감소~~ ✅ 완료
5. ~~**스킬 연출** - 이름 표시, 이펙트 애니메이션~~ ✅ 기본 완료
6. **특수 효과** - 스턴, 선제 기습, 쿨다운 초기화

---

## 5. 스킬 데이터 예시

```typescript
const SKILL_DATA: SkillConfig[] = [
  {
    id: 'fire-attack',
    name: '화계',
    type: 'active',
    target: 'enemy_all',
    effects: [{ type: 'damage', value: 150, attribute: 'intelligence' }],
    cooldown: 4,
    mpCost: 50,
    description: '적 전체에 지력 비례 데미지',
  },
  {
    id: 'water-attack',
    name: '수계',
    type: 'active',
    target: 'enemy_column',
    effects: [{ type: 'damage', value: 200, attribute: 'intelligence' }],
    cooldown: 3,
    mpCost: 40,
    description: '적 종렬 관통 데미지',
  },
  {
    id: 'rock-fall',
    name: '낙석',
    type: 'active',
    target: 'enemy_single',
    effects: [
      { type: 'damage', value: 300 },
      { type: 'debuff', value: 100, attribute: 'speed', duration: 1 }, // 스턴 (행동불가)
    ],
    cooldown: 5,
    mpCost: 60,
    description: '적 단일 고정 데미지 + 스턴',
  },
  {
    id: 'heal',
    name: '치료',
    type: 'active',
    target: 'ally_all',
    effects: [{ type: 'heal', value: 30 }],
    cooldown: 4,
    mpCost: 45,
    description: '아군 전체 HP 30% 회복',
  },
  {
    id: 'iron-wall',
    name: '철벽',
    type: 'active',
    target: 'ally_row', // 전열 지정 필요
    effects: [{ type: 'buff', value: 50, attribute: 'defense', duration: 3 }],
    cooldown: 5,
    mpCost: 40,
    description: '아군 전열 방어력 50% 증가',
  },
];
```
