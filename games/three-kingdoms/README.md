# ⚔️ 삼국지 패왕전 (Three Kingdoms: Warlord)

장수 수집형 전략 RPG - 방치형 멀티플레이어 게임

## 🚀 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env` 파일 생성:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 빌드
```bash
npm run build
```

## 🏗️ 기술 스택

- **게임 엔진**: Phaser 3
- **언어**: TypeScript
- **백엔드**: Supabase (PostgreSQL + Auth + Realtime)
- **호스팅**: Cloudflare Pages
- **번들러**: Vite

## 📁 폴더 구조

```
/src
  /scenes      - Phaser 씬 (Boot, Preload, Login, Main, Battle)
  /services    - Supabase 연동 서비스
  /entities    - 게임 엔티티 (General, Skill 등)
  /managers    - 게임 매니저 (GameManager, BattleManager)
  /ui          - UI 컴포넌트
  /utils       - 유틸리티
/supabase
  /migrations  - DB 마이그레이션
  /functions   - Edge Functions
/assets        - 이미지, 사운드
```

## 🎮 게임 기능

- [ ] 장수 수집 (가챠)
- [ ] 3x3 진형 전투
- [ ] 방치 보상
- [ ] PvP 투기장
- [ ] 스테이지 정복

## 📜 라이선스

MIT
