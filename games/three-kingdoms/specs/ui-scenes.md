# UI/씬 시스템 스펙 (UI & Scenes)

## 1. 현재 구현 상태

### ✅ 완료된 씬

#### 씬 구조 (`src/main.ts`)
```typescript
scene: [BootScene, PreloadScene, LoginScene, MainScene, BattleScene]
```

#### BootScene (`src/scenes/BootScene.ts`)
- 최소 에셋 로드 준비
- PreloadScene으로 전환

#### PreloadScene (`src/scenes/PreloadScene.ts`)
- 로딩 프로그레스 바 표시
- 타이틀 "삼국지 패왕전" 표시
- 에셋 로드 (TODO: 실제 에셋 없음)
- LoginScene으로 전환

#### LoginScene (`src/scenes/LoginScene.ts`)
- 타이틀 표시 (⚔️ 삼국지 패왕전)
- 🎮 게스트로 시작 버튼
- 🔵 Google 로그인 버튼 (온라인 모드)
- 오프라인 모드 경고 표시
- guestId 로컬스토리지 저장

#### MainScene (`src/scenes/MainScene.ts`)
- **상단 자원 바**
  - 💰 금화, 💎 보석, ⚡ 스태미나
- **메인 화면**
  - 🏯 영지 아이콘
  - "천하를 정복하라!" 문구
- **중앙 버튼**
  - ⚔️ 출전 → BattleScene
  - 🎰 장수 모집 (TODO)
- **하단 네비게이션**
  - 🏠 홈, ⚔️ 전투, 👥 장수, 🏪 상점, 📊 더보기

#### BattleScene (`src/scenes/BattleScene.ts`)
- 전투 배경 (그라디언트)
- 스테이지 정보 표시
- 3x3 그리드 진형 (아군/적군)
- 유닛 표시 (이모지: 🗡️🛡️🏹👹👺💀)
- HP 바 표시
- 배속 버튼 (1x/2x/4x)
- ← 나가기 버튼
- 승/패 결과 팝업

### 📐 화면 설정

```typescript
const config = {
  width: 450,
  height: 800,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

- **해상도**: 450 x 800 (세로모드)
- **스케일 모드**: FIT + 자동 중앙 정렬

---

## 2. 남은 요구사항

### ❌ 미구현 씬

| 씬 | 기획서 요구사항 | 상태 |
|-----|----------------|------|
| **FormationScene** | 진형 배치 UI | 미구현 |
| **GeneralListScene** | 장수 목록 | 미구현 |
| **GeneralDetailScene** | 장수 상세 (레벨업/장비) | 미구현 |
| **GachaScene** | 주점 가챠 UI | 미구현 |
| **ShopScene** | 상점 | 미구현 |
| **StageSelectScene** | 스테이지 선택 | 미구현 |
| **SettingsScene** | 설정 | 미구현 |
| **InventoryScene** | 인벤토리 (장비/아이템) | 미구현 |

### 📋 기획서 화면 구성

```
┌─────────────────────┐
│     [자원 바]        │  ✅ 구현됨
│  금화 | 병량 | 보석   │
├─────────────────────┤
│                     │
│   [메인 화면]        │  ⚠️ 기본만 구현
│   영지 / 장수 일러   │
│                     │
├─────────────────────┤
│ [미니 메뉴]          │  ❌ 미구현
│ 📋임무 🎁우편 ⚔️전투 │
├─────────────────────┤
│    [하단 네비]       │  ✅ UI만 구현 (기능 X)
│ 🏠홈 ⚔️전투 👥장수   │
│ 🏪상점 📊더보기      │
└─────────────────────┘
```

### ❌ 미구현 UI 컴포넌트

| 컴포넌트 | 설명 | 상태 |
|---------|------|------|
| **자원 바 업데이트** | 실시간 자원 반영 | 미구현 (하드코딩) |
| **버튼 컴포넌트** | 재사용 가능 버튼 | 인라인 구현 |
| **모달/팝업** | 공통 팝업 시스템 | 미구현 |
| **토스트 메시지** | 알림 표시 | 미구현 |
| **탭 메뉴** | 화면 내 탭 전환 | 미구현 |
| **스크롤 리스트** | 장수 목록 등 | 미구현 |
| **드래그앤드롭** | 진형 배치 | 미구현 |
| **프로그레스 바** | 경험치/HP 등 | 기본만 구현 |

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-UI-01: 로그인 화면
```
GIVEN 앱을 실행했을 때
WHEN 로딩이 완료되면
THEN 게스트/Google 로그인 버튼이 표시된다
```
**상태: ✅ 완료**

### AC-UI-02: 메인 화면
```
GIVEN 로그인이 완료되었을 때
WHEN MainScene으로 전환되면
THEN 자원 바, 메인 컨텐츠, 하단 네비가 표시된다
```
**상태: ⚠️ 부분 구현** (하드코딩된 자원)

### AC-UI-03: 자원 실시간 업데이트
```
GIVEN 자원이 변경되었을 때
WHEN 화면을 갱신하면
THEN 자원 바의 수치가 업데이트된다
```
**상태: ❌ 미구현**

### AC-UI-04: 하단 네비게이션
```
GIVEN 하단 네비 버튼을 클릭했을 때
WHEN 해당 화면으로 전환되면
THEN 활성 탭이 하이라이트된다
```
**상태: ❌ 미구현** (클릭 이벤트만 로깅)

### AC-UI-05: 전투 화면
```
GIVEN 출전 버튼을 클릭했을 때
WHEN BattleScene으로 전환되면
THEN 전투 UI가 표시되고 전투가 자동 진행된다
```
**상태: ✅ 완료**

### AC-UI-06: 진형 편집 화면
```
GIVEN 장수 탭을 클릭했을 때
WHEN FormationScene으로 전환되면
THEN 3x3 그리드와 장수 목록이 표시된다
```
**상태: ❌ 미구현**

### AC-UI-07: 가챠 화면
```
GIVEN 장수 모집 버튼을 클릭했을 때
WHEN GachaScene으로 전환되면
THEN 단차/10연차 버튼과 천장 카운터가 표시된다
```
**상태: ❌ 미구현**

### AC-UI-08: 배속 조절
```
GIVEN 전투 화면에서 배속 버튼을 클릭했을 때
WHEN 배속이 변경되면
THEN 버튼 텍스트가 1x → 2x → 4x → 1x로 순환한다
```
**상태: ✅ 완료**

### AC-UI-09: 방치 보상 팝업
```
GIVEN 접속 시 방치 보상이 있을 때
WHEN MainScene이 로드되면
THEN 보상 수령 팝업이 표시된다
```
**상태: ❌ 미구현**

### AC-UI-10: 레벨업 이펙트
```
GIVEN 장수가 레벨업했을 때
WHEN 화면에 표시되면
THEN 레벨업 이펙트와 알림이 재생된다
```
**상태: ❌ 미구현**

---

## 4. 다음 구현 우선순위

1. **FormationScene** - 진형 배치 UI (드래그앤드롭)
2. **GeneralListScene** - 장수 목록 (스크롤)
3. **GachaScene** - 가챠 UI 및 연출
4. **공통 컴포넌트** - Button, Modal, Toast
5. **자원 바 업데이트** - GameManager 연동
6. **네비게이션 연결** - 탭별 씬 전환
7. **StageSelectScene** - 챕터/스테이지 선택

---

## 5. 씬 설계 예시

### FormationScene 설계

```typescript
// src/scenes/FormationScene.ts
export class FormationScene extends Phaser.Scene {
  private formation!: Formation;
  private generalList!: General[];
  private gridCells: Phaser.GameObjects.Container[][] = [];
  private draggedGeneral: General | null = null;

  constructor() {
    super({ key: 'FormationScene' });
  }

  create(): void {
    this.createHeader();      // 뒤로가기, 타이틀
    this.createGrid();        // 3x3 진형 그리드
    this.createGeneralList(); // 하단 장수 목록 (스크롤)
    this.createSynergyInfo(); // 시너지 정보
    this.createSaveButton();  // 저장 버튼
  }

  private createGrid(): void {
    const startX = 75;
    const startY = 150;
    const cellSize = 100;
    const gap = 10;

    for (let row = 0; row < 3; row++) {
      this.gridCells[row] = [];
      for (let col = 0; col < 3; col++) {
        const x = startX + col * (cellSize + gap);
        const y = startY + row * (cellSize + gap);
        
        const cell = this.createGridCell(x, y, cellSize, row, col);
        this.gridCells[row][col] = cell;
      }
    }
  }

  private createGridCell(x: number, y: number, size: number, row: number, col: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 0.8);
    bg.fillRoundedRect(0, 0, size, size, 8);
    bg.lineStyle(2, 0xffd700);
    bg.strokeRoundedRect(0, 0, size, size, 8);

    // 행 라벨
    const rowLabels = ['후열', '중열', '전열'];
    const label = this.add.text(size / 2, size + 10, rowLabels[2 - row], {
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5, 0);

    container.add([bg, label]);
    container.setSize(size, size);
    container.setInteractive({ dropZone: true });

    return container;
  }

  private createGeneralList(): void {
    // 하단 스크롤 가능한 장수 카드 목록
    const listY = 520;
    // 드래그 가능한 장수 카드들
  }
}
```

### 공통 Button 컴포넌트

```typescript
// src/ui/Button.ts
export interface ButtonConfig {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  bgColor?: number;
  textColor?: string;
  onClick: () => void;
}

export class Button {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    const { text, x, y, width = 200, height = 50, bgColor = 0x8b0000, textColor = '#ffffff', onClick } = config;

    this.container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0xffd700);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    const label = scene.add.text(0, 0, text, {
      fontSize: '18px',
      color: textColor,
    }).setOrigin(0.5);

    this.container.add([bg, label]);
    this.container.setSize(width, height);
    this.container.setInteractive({ useHandCursor: true });

    this.container.on('pointerover', () => bg.setAlpha(0.8));
    this.container.on('pointerout', () => bg.setAlpha(1));
    this.container.on('pointerdown', onClick);
  }

  setEnabled(enabled: boolean): void {
    this.container.setAlpha(enabled ? 1 : 0.5);
    if (enabled) {
      this.container.setInteractive();
    } else {
      this.container.disableInteractive();
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

---

## 6. 아트 에셋 TODO

```
assets/
├── images/
│   ├── generals/          # 장수 일러스트 (SSR/UR 우선)
│   │   ├── guan-yu.png
│   │   ├── zhang-fei.png
│   │   └── ...
│   ├── ui/                # UI 요소
│   │   ├── button-bg.png
│   │   ├── panel-bg.png
│   │   └── icons/
│   ├── battle/            # 전투 이펙트
│   │   ├── slash.png
│   │   └── fire.png
│   └── backgrounds/       # 배경
│       ├── main-bg.png
│       └── battle-bg.png
├── audio/
│   ├── bgm/
│   └── sfx/
└── fonts/
    └── korean-font.ttf
```
