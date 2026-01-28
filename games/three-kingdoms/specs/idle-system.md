# 방치 보상 시스템 스펙 (Idle Reward System)

## 1. 현재 구현 상태

### ✅ 완료된 기능

#### 방치 보상 계산 (`tests/unit/IdleReward.test.ts`)
- **계산 로직**
  ```typescript
  function calculateIdleReward(lastClaimAt, now, config) {
    const minutes = Math.min(diffMinutes, config.maxHours * 60);
    return {
      gold: minutes * config.goldPerMinute,
      exp: minutes * config.expPerMinute,
      minutes,
    };
  }
  ```

- **설정 인터페이스**
  ```typescript
  interface IdleConfig {
    goldPerMinute: number;  // 정치 합계 * 0.5
    expPerMinute: number;   // 클리어 스테이지 * 2
    maxHours: number;       // 최대 12시간
  }
  ```

### 🧪 테스트 커버리지 (`tests/unit/IdleReward.test.ts`)
- [x] 1시간 방치 보상 계산
- [x] 12시간 최대 보상 계산
- [x] 24시간 방치해도 12시간 캡 적용
- [x] 0분 방치 → 보상 0

### 📋 기획서 방치 보상 공식

| 자원 | 공식 |
|------|------|
| 금화 | 분당 (정치 합계 × 10) |
| 경험치 | 분당 (클리어 스테이지 × 5) |
| 병량 | 분당 (영지 레벨 × 20) |
| 최대 | 12시간 |

---

## 2. 남은 요구사항

### ❌ 미구현 기능

| 기능 | 기획서 요구사항 | 상태 |
|------|----------------|------|
| **IdleManager 클래스** | 서비스/매니저 레이어 | 테스트 함수만 존재 |
| **정치 스탯 연동** | 진형 장수의 정치 합계 | 미구현 |
| **스테이지 연동** | 클리어한 최고 스테이지 | 미구현 |
| **병량 자원** | 영지 레벨 기반 | 미구현 (영지 시스템 없음) |
| **보상 수령 UI** | 팝업/알림 | 미구현 |
| **DB 저장** | lastClaimAt 저장 | 미구현 |
| **푸시 알림** | 최대 누적 시 알림 | 미구현 |

### 📋 기획서 vs 구현 차이점

**테스트의 config 예시:**
```typescript
const config = {
  goldPerMinute: 100,  // 정치 200 가정 (200 * 0.5)
  expPerMinute: 20,    // 스테이지 10 가정 (10 * 2)
  maxHours: 12,
};
```

**기획서 공식:**
```
goldPerMinute = 정치합계 × 10  (테스트는 × 0.5)
expPerMinute = 스테이지 × 5   (테스트는 × 2)
```

→ **불일치**: 테스트와 기획서 공식이 다름 (확인 필요)

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-IDL-01: 방치 보상 계산
```
GIVEN 마지막 접속 시간이 T1이고 현재 시간이 T2일 때
WHEN 보상을 계산하면
THEN (T2-T1) 분만큼의 보상이 계산된다
```
**상태: ✅ 완료**

### AC-IDL-02: 최대 시간 제한
```
GIVEN 24시간 이상 방치했을 때
WHEN 보상을 계산하면
THEN 최대 12시간분의 보상만 계산된다
```
**상태: ✅ 완료**

### AC-IDL-03: 금화 계산
```
GIVEN 진형 장수의 정치 합계가 P일 때
WHEN 방치 보상을 계산하면
THEN 금화 = 분 × P × 10
```
**상태: ❌ 미구현** (정치 스탯 연동 없음)

### AC-IDL-04: 경험치 계산
```
GIVEN 클리어한 최고 스테이지가 S일 때
WHEN 방치 보상을 계산하면
THEN 경험치 = 분 × S × 5
```
**상태: ❌ 미구현** (스테이지 연동 없음)

### AC-IDL-05: 병량 계산
```
GIVEN 영지 레벨이 L일 때
WHEN 방치 보상을 계산하면
THEN 병량 = 분 × L × 20
```
**상태: ❌ 미구현** (영지 시스템 없음)

### AC-IDL-06: 보상 수령
```
GIVEN 방치 보상이 누적되었을 때
WHEN 게임에 접속하면
THEN 보상 수령 팝업이 표시된다
```
**상태: ❌ 미구현**

### AC-IDL-07: 보상 수령 후 타이머 리셋
```
GIVEN 보상을 수령했을 때
WHEN 수령이 완료되면
THEN lastClaimAt이 현재 시간으로 업데이트된다
```
**상태: ❌ 미구현**

### AC-IDL-08: VIP 보너스
```
GIVEN VIP 레벨이 N일 때
WHEN 방치 보상을 계산하면
THEN 기본 보상에 VIP 보너스가 적용된다
```
**상태: ❌ 미구현**

### AC-IDL-09: 푸시 알림
```
GIVEN 12시간이 경과했을 때
WHEN 유저가 게임에 없으면
THEN 푸시 알림이 발송된다
```
**상태: ❌ 미구현**

---

## 4. 다음 구현 우선순위

1. **IdleManager 클래스** - 서비스 레이어로 분리
2. **정치 스탯 연동** - Formation → General → politics 합계
3. **스테이지 진행 연동** - UserData에 maxClearedStage 추가
4. **DB 저장** - lastClaimAt 필드 추가
5. **보상 수령 UI** - MainScene에 팝업 추가
6. **VIP 보너스** - 배율 적용 로직

---

## 5. 구현 예시

### IdleManager 클래스 설계

```typescript
// src/managers/IdleManager.ts
export interface IdleConfig {
  goldMultiplier: number;      // 기본 10
  expMultiplier: number;       // 기본 5
  foodMultiplier: number;      // 기본 20 (병량)
  maxHours: number;            // 기본 12
  vipBonusRate: number;        // VIP 보너스 배율
}

export interface IdleReward {
  gold: number;
  exp: number;
  food: number;
  minutes: number;
}

export class IdleManager {
  constructor(
    private config: IdleConfig,
    private formation: Formation,
    private generals: Map<string, General>,
    private maxClearedStage: number,
    private territoryLevel: number,
  ) {}

  calculateReward(lastClaimAt: Date, now: Date): IdleReward {
    const diffMs = now.getTime() - lastClaimAt.getTime();
    const minutes = Math.min(
      Math.floor(diffMs / 60000),
      this.config.maxHours * 60
    );

    const totalPolitics = this.getTotalPolitics();
    const vipMultiplier = 1 + this.config.vipBonusRate;

    return {
      gold: Math.floor(minutes * totalPolitics * this.config.goldMultiplier * vipMultiplier),
      exp: Math.floor(minutes * this.maxClearedStage * this.config.expMultiplier * vipMultiplier),
      food: Math.floor(minutes * this.territoryLevel * this.config.foodMultiplier * vipMultiplier),
      minutes,
    };
  }

  private getTotalPolitics(): number {
    const unitIds = this.formation.getAllUnits();
    return unitIds.reduce((sum, id) => {
      const general = this.generals.get(id);
      return sum + (general?.calculateStats().politics ?? 0);
    }, 0);
  }
}
```

### DB 스키마 추가 (users 테이블)

```sql
ALTER TABLE users ADD COLUMN last_idle_claim TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN max_cleared_stage INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN territory_level INTEGER DEFAULT 1;
```
