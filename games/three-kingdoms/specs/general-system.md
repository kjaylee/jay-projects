# 장수 시스템 스펙 (General System)

## 1. 현재 구현 상태

### ✅ 완료된 기능

#### General 클래스 (`src/entities/General.ts`)
- **기본 속성**
  - `id`, `name`, `grade` (N/R/SR/SSR/UR), `generalClass`, `faction`
  - `baseStats`: 기본 스탯 (attack, defense, intelligence, speed, politics)
  - `level`, `stars`, `exp`, `skillIds`

- **등급 (GeneralGrade)**
  - N (일반) → R (희귀) → SR (영웅) → SSR (전설) → UR (신화)
  - 등급별 색상 코드 지원 (`getGradeColor()`)

- **클래스 (GeneralClass)**
  - `warrior` (맹장), `strategist` (책사), `archer` (궁장), `cavalry` (기장), `support` (방장)

- **세력 (Faction)**
  - `wei` (위), `shu` (촉), `wu` (오), `neutral` (중립), `other` (기타)

#### 스탯 계산
- **레벨업 공식**: `base * (1 + level * 0.1)`
  - 레벨 10 시 200% 스탯
- **승급 공식**: `* (1 + (stars - 1) * 0.1)`
  - 5성 시 +40% 보너스
- **최대 레벨**: 100
- **최대 별**: 5

#### GeneralStats 클래스 (`src/entities/GeneralStats.ts`)
- 5대 스탯: 무력(attack), 방어(defense), 지력(intelligence), 속도(speed), 정치(politics)
- 전투력 계산: `attack + defense + intelligence + speed`
- 버프/디버프 적용 (`applyBuff`)
- 스탯 합산 (`add`), 배율 적용 (`multiply`)

#### 레벨업/승급 시스템
- `levelUp(levels)`: 레벨 증가
- `addExp(amount)`: 경험치 추가 → 자동 레벨업
- `expToNextLevel`: `level * 100` (다음 레벨 필요 경험치)
- `upgrade()`: 별 증가 (최대 5성)

#### 직렬화
- `toJSON()` / `fromJSON()` 지원

### 🧪 테스트 커버리지 (`tests/unit/General.test.ts`)
- [x] 장수 기본 생성
- [x] 레벨/별 지정 생성
- [x] 레벨업 시 스탯 증가 공식
- [x] 승급 시 스탯 보너스
- [x] 최대 레벨/별 제한
- [x] 등급별 스탯 범위 검증 (UR ≥ 90, N ≤ 60)
- [x] GeneralStats 전투력 계산
- [x] 버프/디버프 적용 (최소 0)

---

## 2. 남은 요구사항

### ❌ 미구현 기능

| 기능 | 기획서 요구사항 | 상태 |
|------|----------------|------|
| **매력 스탯** | 등용 확률, 사기 회복 | 기획서 명시 (politics로 대체됨) |
| **통솔 스탯** | 부대 병력 상한, 방어력 | 미구현 (defense로 대체) |
| **장비 장착** | 무기/방어구/악세 슬롯 | 엔티티만 존재, 연동 미구현 |
| **스킬 연동** | `skillIds`로 스킬 참조 | 참조만 있고 실제 적용 로직 없음 |
| **각성 시스템** | UR 전용, 외형 변경 + 신스킬 | 미구현 |
| **장수 데이터 100명** | 기획서 TODO | 샘플 데이터만 존재 |

### 📋 기획서 vs 구현 차이점

**기획서의 5대 능력치:**
| 스탯 | 효과 |
|------|------|
| 통솔 | 부대 병력 상한, 방어력 |
| 무력 | 물리 공격력, 치명타 |
| 지력 | 계략 데미지, 계략 저항 |
| 정치 | 자원 생산량, 건설 속도 |
| 매력 | 등용 확률, 사기 회복 |

**현재 구현 (5대 스탯):**
- attack (무력) ✅
- defense (통솔의 방어력 역할) ⚠️
- intelligence (지력) ✅
- speed (추가됨) ⚠️
- politics (정치) ✅

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-GEN-01: 장수 생성
```
GIVEN 장수 설정(id, name, grade, class, faction, baseStats)이 주어졌을 때
WHEN 새 장수를 생성하면
THEN 기본 레벨 1, 별 1, 경험치 0으로 초기화된다
```
**상태: ✅ 완료**

### AC-GEN-02: 스탯 계산
```
GIVEN 레벨 L, 별 S인 장수가 있을 때
WHEN calculateStats()를 호출하면
THEN base * (1 + L * 0.1) * (1 + (S-1) * 0.1) 공식으로 계산된다
```
**상태: ✅ 완료**

### AC-GEN-03: 경험치 → 레벨업
```
GIVEN 레벨 N인 장수가 있을 때
WHEN expToNextLevel 이상의 경험치를 획득하면
THEN 자동으로 레벨이 올라가고 초과 경험치는 이월된다
```
**상태: ✅ 완료**

### AC-GEN-04: 장비 장착
```
GIVEN 장수와 장비가 있을 때
WHEN 장비를 장착하면
THEN 장수의 최종 스탯에 장비 보너스가 적용된다
```
**상태: ❌ 미구현**

### AC-GEN-05: 스킬 발동
```
GIVEN 스킬을 보유한 장수가 전투 중일 때
WHEN 쿨다운이 0이면
THEN 해당 스킬이 발동될 수 있다
```
**상태: ❌ 미구현** (스킬 엔티티는 있으나 전투 연동 없음)

### AC-GEN-06: 각성 (UR 전용)
```
GIVEN UR 등급 장수가 최대 레벨/별에 도달했을 때
WHEN 각성 재료를 소모하면
THEN 외형이 변경되고 신규 스킬이 해금된다
```
**상태: ❌ 미구현**

---

## 4. 다음 구현 우선순위

1. **장비 연동** - Equipment 엔티티를 General에 연결
2. **스킬 연동** - skillIds를 실제 Skill 객체로 로드
3. **스탯 재정의** - 기획서의 5대 능력치(통솔/무력/지력/정치/매력)로 변경 검토
4. **장수 데이터** - 100명 장수 마스터 데이터 JSON/DB 작성
5. **각성 시스템** - UR 장수 전용 각성 로직
