---
emoji: 🧩
title: pnpm workspace 모노레포에서 Turborepo로 날개 달아주기
date: 2025-07-05
categories: featured-skills
---

> `pnpm Workspace로 모노레포를 시작하며 마주한 문제들` 포스트의 연장 글입니다.

이전 글에서 `pnpm workspace`를 사용해 모노레포를 구축하며 여러 문제를 마주했습니다.

공통 컴포넌트를 수정하면 바로 반영되지 않았고,
source를 직접 바라보게 만들기 위해 alias, `tsconfig references`, `composite` 설정까지 추가했습니다.

결국 개발 경험(DX)은 좋아졌지만, 이런 생각이 들기 시작했습니다.

> “이 설정들… 프로젝트가 늘어나도 계속 유지해야 하는 걸까?”

그리고 그 과정에서 자연스럽게 `Turborepo`를 다시 보게 되었습니다.

다만 그전에 하나.

개인적으로는 먼저 **빌드 도구를 `vite`에서 `tsup`으로 바꾼 경험**이 꽤 컸습니다.

---

## 왜 vite 대신 tsup을 선택했을까?

처음 공통 패키지 빌드 도구로 `vite`를 선택한 이유는 단순했습니다.

익숙했습니다.

당시에는 `tsup`이라는 도구 자체를 잘 몰랐고,

> “빌드 도구 = vite”

라는 인식이 더 강했습니다.

물론 Vite도 Library Mode를 통해 공통 패키지를 빌드할 수 있습니다.

실제로 저도 아래처럼 설정해서 사용했습니다.

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

문제는 설정이 점점 늘어났다는 점이었습니다.

- alias 설정
- `vite-tsconfig-paths`
- `paths`
- `references`
- `composite`
- build entry 분리
- server/client export 관리

처음에는

> “이 정도는 모노레포면 당연한 건가?”

라고 생각했습니다.

~~조금 귀찮긴 했다~~

하지만 공통 패키지 빌드라는 목적만 놓고 보니 조금 과한 느낌도 들었습니다.

그때 알게 된 게 `tsup`이었습니다.

---

## tsup은 생각보다 단순했다

`tsup`은 라이브러리 패키지 빌드에 훨씬 단순했습니다.

설정도 생각보다 짧았습니다.

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

그리고 가장 마음에 들었던 건 `watch` 모드였습니다.

```json
{
  "scripts": {
    "dev": "tsup --watch"
  }
}
```

이전에는 앱이 `shared/src`를 직접 바라봤기 때문에 alias와 TypeScript 설정이 필요했습니다.

하지만 `tsup`으로 바꾸고 나서는 구조가 달라졌습니다.

```text
packages/shared/src
→ tsup --watch
→ dist 갱신
→ apps에서 dist 사용
```

즉, 앱이 build 결과물을 바라보는 구조로 바뀌었습니다.

덕분에 source 직접 참조를 위한 설정이 필요 없어졌고, 코드 수정 시에도 빠르게 변경사항을 확인할 수 있었습니다.

이때 처음 이런 생각이 들었습니다.

> “굳이 source를 직접 바라보지 않아도 되겠는데?”

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

처음에는

> “이게 진짜 빨라질까?”

싶었습니다.

하지만 다시 build를 해보니 체감이 꽤 됐습니다.

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

다음에는 실제로 `Turborepo + tsup` 기반 모노레포를 어떻게 구성했는지 정리해보려고 합니다.

## REF

- [Turborepo 공식문서](https://turborepo.dev/docs)
- [3. 모노레포 도구 비교](https://tech.hancom.com/intro-to-monorepo/)
- [What is tsup?](https://dev.to/teaganga/what-is-tsup-5785)
