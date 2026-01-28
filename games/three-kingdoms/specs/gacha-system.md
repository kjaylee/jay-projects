# 가챠 시스템 스펙 (Gacha System)

## 1. 현재 구현 상태

### ✅ 완료된 기능

#### 가챠 확률 로직 (`tests/unit/GachaSystem.test.ts`)
- **기본 확률**
  | 등급 | 확률 |
  |------|------|
  | N (일반) | 60% |
  | R (희귀) | 30% |
  | SR (영웅) | 8% |
  | SSR (전설) | 1.8% |
  | UR (신화) | 0.2% |

- **천장 시스템**
  - 80회 연속 SSR 미획득 시 SSR 보장

- **확률 분포 검증**
  - 1만회 시뮬레이션 테스트
  - N등급 약 60% (55~65%)
  - SSR+UR 약 2% (1~3%)

### 🧪 테스트 커버리지 (`tests/unit/GachaSystem.test.ts`)
- [x] random 0.0 → N 등급
- [x] random 0.59 → N 등급 (경계값)
- [x] random 0.61 → R 등급
- [x] random 0.91 → SR 등급
- [x] random 0.99 → SSR 등급
- [x] random 0.999 → UR 등급
- [x] 천장 80회 → SSR 보장
- [x] 1만회 시뮬레이션 확률 검증

### 📋 기획서 가챠 시스템

**장수 등급:**
```
⬜ N (일반) → 🟦 R (희귀) → 🟪 SR (영웅) → 🟨 SSR (전설) → 🔴 UR (신화)

[등급별 예시]
N: 장송, 미축, 손건
R: 장료, 하후돈, 감녕
SR: 관우, 장비, 조운, 주유
SSR: 조조, 유비, 손권, 여포
UR: 제갈량, 사마의, 관우(신), 여포(천하무쌍)
```

---

## 2. 남은 요구사항

### ❌ 미구현 기능

| 기능 | 기획서 요구사항 | 상태 |
|------|----------------|------|
| **GachaManager 클래스** | 서비스 레이어 | 테스트 함수만 존재 |
| **장수 풀** | 등급별 장수 목록 | 미구현 |
| **가챠 UI** | 주점 씬 | 미구현 |
| **재화 소모** | 보석/티켓 소모 | 미구현 |
| **일일 무료 가챠** | 1일 1회 무료 | 미구현 |
| **10연차** | 10회 연속 뽑기 | 미구현 |
| **천장 카운터 저장** | pityCount DB 저장 | 미구현 |
| **픽업 배너** | 특정 장수 확률 업 | 미구현 |
| **연출** | 뽑기 애니메이션 | 미구현 |
| **중복 장수 처리** | 승급 재료로 변환 | 미구현 |

### 📋 기획서 주점(가챠) 콘텐츠

| 항목 | 내용 |
|------|------|
| **일일 무료** | 1일 1회 무료 가챠 |
| **단차** | 보석 160개 |
| **10연차** | 보석 1600개 (SR 1장 보장) |
| **시즌 한정** | UR 확률업 배너 |
| **천장** | 80회 SSR 보장 |

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-GCH-01: 기본 가챠
```
GIVEN 가챠 풀에 장수가 있을 때
WHEN 1회 뽑기를 수행하면
THEN 확률에 따라 등급이 결정되고 해당 등급의 장수가 반환된다
```
**상태: ⚠️ 부분 구현** (등급만 결정, 장수 미반환)

### AC-GCH-02: 확률 분포
```
GIVEN 가챠를 N회 수행했을 때
WHEN 결과를 집계하면
THEN N=60%, R=30%, SR=8%, SSR=1.8%, UR=0.2%에 근접한다
```
**상태: ✅ 완료**

### AC-GCH-03: 천장 보장
```
GIVEN 79회 연속 SSR 미획득일 때
WHEN 80번째 뽑기를 수행하면
THEN SSR 등급이 보장된다
```
**상태: ✅ 완료**

### AC-GCH-04: 재화 소모
```
GIVEN 보석 160개 이상 보유 중일 때
WHEN 단차를 수행하면
THEN 보석 160개가 차감되고 가챠가 실행된다
```
**상태: ❌ 미구현**

### AC-GCH-05: 재화 부족
```
GIVEN 보석이 160개 미만일 때
WHEN 단차를 시도하면
THEN "재화 부족" 메시지가 표시되고 가챠가 실행되지 않는다
```
**상태: ❌ 미구현**

### AC-GCH-06: 일일 무료 가챠
```
GIVEN 오늘 무료 가챠를 사용하지 않았을 때
WHEN 무료 가챠를 수행하면
THEN 재화 소모 없이 가챠가 실행된다
```
**상태: ❌ 미구현**

### AC-GCH-07: 10연차
```
GIVEN 보석 1600개 이상 보유 중일 때
WHEN 10연차를 수행하면
THEN 10회 가챠 결과가 반환되고 최소 SR 1장이 보장된다
```
**상태: ❌ 미구현**

### AC-GCH-08: 중복 장수 처리
```
GIVEN 이미 보유한 장수가 뽑혔을 때
WHEN 결과를 처리하면
THEN 해당 장수의 승급 재료(조각)로 변환된다
```
**상태: ❌ 미구현**

### AC-GCH-09: 픽업 배너
```
GIVEN 픽업 배너에 특정 UR 장수가 있을 때
WHEN UR 등급이 뽑히면
THEN 50% 확률로 픽업 장수가 선택된다
```
**상태: ❌ 미구현**

### AC-GCH-10: 가챠 연출
```
GIVEN 가챠를 실행했을 때
WHEN 결과가 표시되면
THEN 등급에 따른 연출 애니메이션이 재생된다
```
**상태: ❌ 미구현**

---

## 4. 다음 구현 우선순위

1. **GachaManager 클래스** - 서비스 레이어로 분리
2. **장수 풀 데이터** - 등급별 장수 ID 목록
3. **재화 연동** - GameManager.updateGems()
4. **일일 무료 가챠** - lastFreeGachaDate 저장
5. **10연차** - SR 보장 로직
6. **가챠 UI** - GachaScene 추가
7. **천장 카운터 저장** - DB pityCount 필드
8. **중복 처리** - 조각 시스템

---

## 5. 구현 예시

### GachaManager 클래스 설계

```typescript
// src/managers/GachaManager.ts
import { General, GeneralGrade } from '../entities/General';

interface GachaPool {
  N: string[];      // ['zhang-song', 'mi-zhu', ...]
  R: string[];      // ['zhang-liao', 'xiahou-dun', ...]
  SR: string[];     // ['guan-yu', 'zhang-fei', ...]
  SSR: string[];    // ['cao-cao', 'liu-bei', ...]
  UR: string[];     // ['zhuge-liang', 'sima-yi', ...]
}

interface GachaResult {
  generalId: string;
  grade: GeneralGrade;
  isNew: boolean;
  duplicateShards?: number;
}

const GACHA_RATES: Record<GeneralGrade, number> = {
  N: 0.60,
  R: 0.30,
  SR: 0.08,
  SSR: 0.018,
  UR: 0.002,
};

const PITY_THRESHOLD = 80;
const SINGLE_COST = 160;
const MULTI_COST = 1600;

export class GachaManager {
  private pityCount: number = 0;
  private pool: GachaPool;

  constructor(pool: GachaPool) {
    this.pool = pool;
  }

  pull(): GachaResult {
    const grade = this.determineGrade();
    const generalId = this.selectGeneral(grade);
    
    // SSR 이상 획득 시 천장 리셋
    if (grade === 'SSR' || grade === 'UR') {
      this.pityCount = 0;
    } else {
      this.pityCount++;
    }

    return {
      generalId,
      grade,
      isNew: true, // TODO: 보유 여부 확인
    };
  }

  pullMulti(count: number = 10): GachaResult[] {
    const results: GachaResult[] = [];
    
    for (let i = 0; i < count; i++) {
      results.push(this.pull());
    }

    // 10연차 SR 보장
    if (count === 10) {
      const hasSROrHigher = results.some(r => 
        r.grade === 'SR' || r.grade === 'SSR' || r.grade === 'UR'
      );
      
      if (!hasSROrHigher) {
        // 마지막을 SR로 교체
        const srId = this.selectGeneral('SR');
        results[9] = { generalId: srId, grade: 'SR', isNew: true };
      }
    }

    return results;
  }

  private determineGrade(): GeneralGrade {
    // 천장 체크
    if (this.pityCount >= PITY_THRESHOLD) {
      return 'SSR';
    }

    const random = Math.random();
    let cumulative = 0;

    for (const [grade, rate] of Object.entries(GACHA_RATES)) {
      cumulative += rate;
      if (random < cumulative) {
        return grade as GeneralGrade;
      }
    }

    return 'N';
  }

  private selectGeneral(grade: GeneralGrade): string {
    const candidates = this.pool[grade];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  getPityCount(): number {
    return this.pityCount;
  }

  setPityCount(count: number): void {
    this.pityCount = count;
  }
}
```

### 장수 풀 데이터 예시

```typescript
// src/data/gacha-pool.ts
export const DEFAULT_GACHA_POOL: GachaPool = {
  N: ['zhang-song', 'mi-zhu', 'sun-jian', 'soldier-1', 'soldier-2'],
  R: ['zhang-liao', 'xiahou-dun', 'gan-ning', 'huang-zhong', 'xu-huang'],
  SR: ['guan-yu', 'zhang-fei', 'zhao-yun', 'zhou-yu', 'lu-xun'],
  SSR: ['cao-cao', 'liu-bei', 'sun-quan', 'lu-bu', 'diao-chan'],
  UR: ['zhuge-liang', 'sima-yi', 'guan-yu-god', 'lu-bu-unmatched'],
};
```

### DB 스키마 추가

```sql
ALTER TABLE users ADD COLUMN pity_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_free_gacha DATE;

CREATE TABLE user_general_shards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  general_id TEXT NOT NULL,
  shard_count INTEGER DEFAULT 0,
  UNIQUE(user_id, general_id)
);
```
