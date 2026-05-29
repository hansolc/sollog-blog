---
emoji: 🧩
title: pnpm workspace 모노레포에서 Turborepo로 날개 달아주기
date: 2025-07-05
categories: featured-skills
---

> `pnpm Workspace로 모노레포를 시작하며 마주한 문제들` 포스트의 연장 글입니다.

[이전 글](/5-pnpm-workspace/)에서 `pnpm workspace`를 사용해 모노레포를 구축하며 여러 문제를 마주했습니다.

공통 컴포넌트를 수정하면 바로 반영되지 않았고,
source를 직접 바라보게 만들기 위해 alias, `tsconfig references`, `composite` 설정까지 추가했습니다.

결국 개발 경험(DX)은 좋아졌지만, 초기에 외부 프로젝트에 접근하며 설정해야 하는 보일러 플레이팅 코드와

매번 build 순서를 개발자가 신경써야 하는 부분이 불편했습니다.

그리고 그 과정에서 자연스럽게 `Turborepo`를 다시 보게 되었습니다.

다만 그전에 하나.

개인적으로는 먼저 **빌드 도구를 `vite`에서 `tsup`으로 바꾼 경험**이 꽤 컸습니다.

---

## 왜 vite 대신 tsup을 선택했을까?

먼저 말하면

> vite가 나쁘다기보다, 내 상황에서 tsup이 더 맞았습니다..

처음 공통 패키지 빌드 도구로 `vite`를 선택한 이유는 "이전에 사용해 본 적이 있어서" 였습니다.

당시에는 `tsup`이라는 도구를 잘 몰랐습니다.

그리고 실제로 Vite도 공통 패키지를 충분히 빌드할 수 있습니다.

```ts
build: {
  lib: {
    entry: {
      client: "src/client/index.ts",
      server: "src/server/index.ts",
    },
    formats: ["es"],
  },
}
```

이런 방식으로 공통 패키지를 빌드하는 데 큰 문제는 없었습니다.

다만 제가 하고싶은 것은 **라이브러리 패키지 빌드**가 핵심이었습니다.

그런데 Vite는 개인적으로 조금 더 큰 도구처럼 느껴졌습니다.

처음에는 단순히 “빠른 빌드 도구” 정도로 생각했는데, 다시 보니 Vite는 단순 빌드 도구라기보다 **앱 개발 경험 전체를 위한 도구**에 가까웠습니다.

예를 들면:

- 빠른 dev server
- HMR
- 브라우저 기반 앱 실행
- plugin ecosystem
- Rollup 기반 production bundling

같은 기능들입니다.

물론 이런 기능들은 웹 애플리케이션 개발에서는 굉장히 강력합니다.

하지만 내 상황은 조금 달랐습니다.

`tsup`은 생각보다 훨씬 단순했습니다.

```ts
export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react'],
  esbuildPlugins: [vanillaExtractPlugin()],
  clean: true,
  ...options,
}));
```

개인적으로는 이 부분이 꽤 인상 깊었습니다.

이 설정만으로도

- `.d.ts` 타입 파일 생성
- `esm`, `cjs` 번들 생성
- React 외부화
- vanilla-extract 처리

까지 가능했습니다.

그리고 추가로 중요한 건 `watch` 모드였습니다.

```json
{
  "scripts": {
    "dev": "tsup --watch"
  }
}
```

결국 제가 최종적으로 이해한 것은,

```text
vite
→ 앱 개발 경험 전체에 강한 도구

tsup
→ TypeScript 라이브러리 build에 집중된 도구
```

그래서 vite가 부족해서가 아니라,

> 내 문제에 비해 조금 더 큰 도구였고,
> tsup이 내 상황에 더 맞았다.

에 가까웠습니다.

---

## 그래서 결국 다시 보게 된 Turborepo

하지만 여전히 아쉬움은 남아 있었습니다.

`pnpm workspace`만으로도 충분히 모노레포를 구성할 수는 있었습니다.

장점도 명확했습니다.

- 학습 곡선이 낮음
- 디스크 공간 절약
- 빠른 설치 속도
- 비교적 단순한 설정

특히 `pnpm`은 같은 패키지를 여러 프로젝트가 사용하더라도 실제 코드는 한 번만 설치하고 심링크(Symlink) 방식으로 공유합니다.

덕분에 디스크 낭비를 줄일 수 있었고, 설치 속도도 빨랐습니다.

하지만 프로젝트가 늘어나면서 점점 불편함이 생겼습니다.

예를 들어 기존에는 이런 스크립트를 직접 관리했습니다.

```json
{
  "scripts": {
    "build:shared": "pnpm --filter @repo/shared build",
    "dev:web": "pnpm --filter web dev",
    "dev:admin": "pnpm --filter admin dev",
    "storybook": "pnpm --filter @repo/shared storybook"
  }
}
```

처음에는 괜찮았습니다.

하지만 프로젝트가 늘어날수록 이런 생각이 들었습니다.

> “어떤 걸 먼저 실행해야 하지?”

> “shared 먼저 build 안 하면 앱이 깨지는데?”

그리고 build도 점점 신경 쓰이기 시작했습니다.

변경되지 않은 프로젝트까지 매번 다시 실행하는 느낌이 들었기 때문입니다.

그때 다시 보게 된 게 `Turborepo`였습니다.

---

## Turborepo는 무엇이 달랐을까?

처음에는 단순히

> “모노레포에서 많이 쓰는 도구”

정도로만 알고 있었습니다.

하지만 다시 보니 해결하려던 문제와 꽤 맞닿아 있었습니다.

개인적으로 이해한 `Turborepo`는

> **모노레포에서 task 실행을 최적화하는 빌드 시스템**

에 가까웠습니다.

여기서 중요한 건:

> `Turborepo`는 `pnpm workspace`를 대체하지 않는다.

는 점입니다.

구조는 여전히 `pnpm workspace`가 담당합니다.

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

그리고 Turborepo는 그 위에서

- build
- lint
- test
- dev

같은 task 실행을 최적화합니다.

---

## 내가 이해한 핵심: 의존하는 프로젝트부터 먼저 실행

개인적으로 이해한 핵심은 이거였습니다.

> “내가 의존하는 프로젝트부터 먼저 실행한다”

예를 들어 구조가 이렇다고 가정해보겠습니다.

```text
apps/web
└── @repo/ui
```

그렇다면 `web`을 build 하기 전에 `ui`가 먼저 build 되어야 합니다.

이전에는 이런 순서를 제가 직접 관리했습니다.

```bash
pnpm --filter @repo/ui build
pnpm --filter web dev
```

하지만 Turborepo에서는 `turbo.json` 한 곳에서 관리할 수 있었습니다.

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

처음엔 `^build`가 이해가 잘 안 됐습니다.

나중에 이해한 건 이거였습니다.

> “내가 의존하는 package의 build를 먼저 실행해라”

즉,

```text
ui build
→ web build
```

순서를 Turborepo가 자동으로 계산합니다.

개인적으로는 이 부분이 꽤 편했습니다.

> “어떤 걸 먼저 build 해야 하지?”

를 더 이상 고민하지 않아도 됐기 때문입니다.

---

## 캐싱이 생각보다 강력했다

Turborepo의 가장 큰 장점 중 하나는 캐싱입니다.

실제로 build를 해보면 `.turbo/cache` 폴더가 생성되는 걸 볼 수 있습니다.

실제로 연속적으로 다시 build를 해보니 체감이 꽤 컸습니다.

변경된 코드가 없다면

> “이미 이전 결과물이 있는데 굳이 다시 실행할 필요가 있을까?”

처럼 cache를 재사용하며 훨씬 빠르게 처리됐습니다.

특히 프로젝트가 많아질수록 체감이 컸습니다.

추가로 `Remote Cache`도 지원합니다.

즉, 협업 시 팀원이 이미 build한 결과물을 재사용할 수도 있습니다.

다만 이 부분은 아직 깊게 사용해보진 않았기에 이번 글에서는 다루지 않겠습니다.

---

## 내가 처음에 잘못 이해했던 부분

처음에는 이렇게 생각했습니다.

> “Turborepo가 pnpm workspace를 대체하는 건가?”

하지만 실제로는 아니었습니다.

역할이 달랐습니다.

```text
pnpm
→ package manager

pnpm workspace
→ package 연결

Turborepo
→ task 실행 최적화
```

즉, 서로 경쟁 관계가 아니라 같이 사용하는 관계에 가까웠습니다.

그리고 `pnpm` 기반으로 사용한다면

- 심링크 기반 패키지 공유
- 디스크 공간 절약
- 빠른 설치

같은 장점은 그대로 가져갈 수 있습니다.

---

## 그래서 지금 내 판단 기준

개인적으로는 이렇게 정리하게 됐습니다.

### 이런 경우엔 pnpm workspace만으로도 충분하다

- 프로젝트 규모가 작다
- package 수가 적다
- build 흐름이 단순하다

---

### 이런 경우엔 Turborepo가 더 잘 맞는다

- shared package가 많다
- build 순서를 자동화하고 싶다
- 캐싱을 통한 빠른 build가 필요하다
- 여러 task를 한 곳에서 관리하고 싶다

정답은 아닌 것 같습니다.

다만 제가 겪었던 문제를 기준으로 보면,

`Turborepo + tsup` 조합은 꽤 만족스러운 선택이었습니다.

## REF

- [Turborepo 공식문서](https://turborepo.dev/docs)
- [3. 모노레포 도구 비교](https://tech.hancom.com/intro-to-monorepo/)
- [What is tsup?](https://dev.to/teaganga/what-is-tsup-5785)
