# Animator

![Animator](/public/logo.png)

애니메이션 제작 도구

## 개요

Animator는 애니메이터가 기준 동작을 녹화하고, 구간을 마킹하고, 동일한 길이로 재생 타이밍을 확인할 수 있도록 여러 기능을 제공합니다.

## 주요 기능

- 타이머
  - 녹화 전 준비 시간 카운트다운
  - 레퍼런스 take 녹화 및 길이 저장
  - 구간 마킹(Shift 홀드)
  - 저장된 take 길이 기준 재생

## 기술 스택

- React 18
- Vite
- TypeScript
- Material UI
- Vitest + Testing Library
- ESLint + Prettier

## 설치 방법

```sh
npm ci
```

## 개발 서버

```sh
npm run dev
```

## 검증 명령

```sh
npm run format
npm run format:check
npm run lint
npm run test
npm run build
npm run check
```

## 단축키

- `R`: Replay
- `Space`: Play / Pause / Resume
- `E`: Reset
- `Shift`: Mark (hold)
- `C`: Record / Stop

## 기여하기

변경 전 `npm run check`를 통과시키는 것을 기준으로 합니다.

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 확인하세요.
