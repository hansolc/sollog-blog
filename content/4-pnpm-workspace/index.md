---
emoji: 🧩
title: pnpm Workspace로 모노레포를 시작하며 마주한 문제들
date: 2026-05-21
categories: featured-skills
---

## 모노레포라는 단어를 들어본 적이 있으신가요?

아마 적지 않은 개발자분들이 한 번쯤은 들어보셨을 거라고 생각합니다.

저는 처음 SI 회사에 입사했을 때 이 단어를 마주했습니다.  
그전까지는 프로젝트 하나당 하나의 repository를 생성하는 방식이 익숙했습니다.

새 프로젝트를 시작할 때면 항상 아래와 같이 시작했습니다.

```bash
npx create-react-app
```

혹은

```bash
npx create-next-app
```

그리고 프로젝트마다 반복했습니다.

- eslint 설정
- prettier 설정
- tsconfig 설정
- 공통 컴포넌트 작성

~~eslint, tsconfig는 있는걸 그대로 사용했어요..~~

Button, Input 같은 컴포넌트도 결국 비슷한 형태로 다시 만들고 있었습니다.

모노레포를 알기 전까지는!

---

## 내가 처음 이해한 모노레포

구조는 간단했습니다.

```text
apps/
packages/
```

`apps`에는 실제 서비스 프로젝트가 있었고,  
`packages`에는 여러 프로젝트에서 함께 사용하는 UI 컴포넌트, 유틸 함수, 설정들이 존재했습니다.

처음에는 단순히

> “공통 코드를 한 곳에 모아두는 구조구나”

정도로 이해했습니다.

하지만 실제로 개발하다 보니 생각이 조금 바뀌었습니다.

제가 느낀 모노레포는 단순히 repository를 하나로 합치는 개념이 아니었습니다.

개인적으로는 이렇게 이해하게 됐습니다.

> **여러 프로젝트가 공통된 코드와 개발 규칙을 함께 공유하기 위한 구조**

예를 들면 이런 것들입니다.

- 공통 UI 컴포넌트
- 유틸 함수
- eslint / prettier 규칙
- tsconfig 설정

특히 개인 프로젝트를 만들 때마다 반복했던 설정 비용을 줄일 수 있다는 점이 꽤 크게 와닿았습니다.

그래서 자연스럽게 이런 생각이 들었습니다.

> “개인 프로젝트도 이렇게 만들 수 없을까?”

그리고 그 시작이 바로 `pnpm workspace` 였습니다.

---

## 왜 pnpm workspace를 선택했을까?

사실 가장 큰 이유는 회사에서 이미 사용하고 있었기 때문이다.

회사에서도 `pnpm workspace` 기반 모노레포 구조를 사용하고 있었고,  
실무에서 사용하는 방식을 직접 경험해보며 익숙해지고 싶었다.

하지만 조사해 보니 생각보다 장점이 명확했다.

### 1. 생각보다 가벼운 패키지 관리

처음에는 단순히

> “pnpm이 빠르다더라”

정도로만 알고 있었다.

하지만 실제 동작 방식을 보고 이해가 됐다.

예를 들어 모노레포 안에서 여러 프로젝트가 모두 `react`를 사용한다고 가정해보자.

기존 방식이라면 프로젝트마다 패키지를 각각 설치하게 된다.

```text
app-a/node_modules/react
app-b/node_modules/react
app-c/node_modules/react
```

하지만 `pnpm`은 조금 다르게 동작했다.

실제 패키지는 루트 저장소에 한 번만 저장하고,

```text
node_modules/.pnpm
```

각 프로젝트는 그 패키지를 바라보는 방식이었다.

```text
app-a → react
app-b → react
app-c → react
```

처음엔 조금 신기했다.

> “같은 패키지를 굳이 여러 번 복사하지 않는구나”

덕분에 디스크 낭비를 줄일 수 있었고,  
모노레포 환경에서도 비교적 가볍게 관리할 수 있었다.

### 2. 설정 난이도가 생각보다 낮았다

처음에는 모노레포라고 하면

> “엄청 복잡한 설정이 필요하지 않을까?”

라고 생각했다.

그런데 `pnpm workspace`는 의외로 단순했다.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

이 정도 설정만으로 workspace 패키지로 인식된다.

그리고 내부 패키지도 바로 연결할 수 있었다.

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

개인적으로는 이 부분에서 꽤 진입장벽이 낮다고 느꼈다.

> “생각보다 바로 시작할 수 있네?”

라는 느낌이었다.

그렇게 `pnpm workspace` 기반 모노레포를 시작하게 됐다.

하지만 실제 개발은 생각보다 순탄하지 않았다.

### 1. Workspace 구성이 간단했다

설정이 생각보다 어렵지 않았습니다.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

이렇게 설정하면 workspace 패키지로 인식됩니다.

그리고 내부 패키지를 바로 사용할 수 있습니다.

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

개인적으로는 이 부분이 꽤 인상 깊었습니다.

> “생각보다 모노레포 진입 장벽이 높지 않네?”

라는 생각이 들었습니다.

### 2. 공통 컴포넌트를 재사용할 수 있었다

제가 만들고 싶었던 구조는 단순했습니다.

```text
apps/
 ├─ react-app
 └─ next-app

packages/
 ├─ ui
 ├─ utils
 └─ configs
```

- `apps` → 실제 배포 프로젝트
- `packages` → 공통 UI, 유틸, 설정

그리고 `packages/ui`에서 만든 Button을 여러 프로젝트에서 재사용하는 구조였습니다.

```tsx
import { Button } from '@repo/ui';
```

처음에는 꽤 만족스러웠습니다.

“이제 Button을 프로젝트마다 복사 붙여넣기 하지 않아도 되겠네”

싶었습니다.

하지만 문제는 실제 개발을 시작하면서 발생했습니다.

---

## 첫 번째 문제: 공통 컴포넌트를 수정해도 바로 반영되지 않았다

처음에는 이렇게 생각했습니다.

> “workspace로 연결했으니까 수정하면 자동으로 반영되겠지?”

하지만 실제로는 아니었습니다.

제가 구성한 구조에서는 `packages/ui`가 하나의 라이브러리처럼 동작했습니다.

즉,

```text
packages/ui(src)
→ build
→ apps/react-app 사용
```

이런 흐름이었습니다.

그래서 Button을 수정하면

```tsx
// packages/ui/Button.tsx
const Button = () => {
  return <button>New Button</button>;
};
```

앱에서 바로 보이지 않았습니다.

매번 build를 다시 해야 했습니다.

```bash
pnpm build
```

```text
수정
→ build
→ 앱 확인
→ 다시 수정
→ build
```

이 과정이 반복됐습니다.

생각보다 꽤 불편했습니다.

그때 처음 이런 고민을 하게 됐습니다.

> “build 없이 바로 개발할 수는 없을까?”

---

## 해결 방법 1. source를 직접 바라보게 만들기

제가 사용하던 공통 컴포넌트 패키지는 `vite`로 구성했습니다.

처음에는 단순히 build 도구라고만 생각했습니다.

하지만 실제로는 Vite의 강점이 **빠른 개발 경험(HMR)** 에 있다는 걸 나중에서야 이해하게 됐습니다.

그래서 앱이 build 결과물이 아니라 source 자체를 바라보게 바꿨습니다.

```ts
// vite.config.ts
resolve: {
  alias: {
    "@repo/ui": path.resolve(
      __dirname,
      "../../packages/ui/src"
    )
  }
}
```

이렇게 설정하니 흐름이 달라졌습니다.

```text
기존
apps → packages/ui/dist

변경 후
apps → packages/ui/src
```

그 결과 수정사항이 바로 반영됐습니다.

개인적으로는 이 순간 처음으로

> “아 이게 DX 개선이구나”

라는 걸 체감했습니다.

---

## 두 번째 문제: TypeScript 에러

하지만 alias만 등록한다고 끝은 아니었습니다.

곧바로 TypeScript 에러를 만나게 됐습니다.

```text
is not listed within the file list of project
```

처음에는 이해가 잘 안 됐습니다.

> “경로도 맞고 import도 되는데 왜 에러지?”

나중에 이해한 건 이거였습니다.

TypeScript는 단순히 import했다고 같은 프로젝트로 보지 않았습니다.

즉,

- 파일을 가져오는 것
- TypeScript 프로젝트로 포함되는 것

은 다른 문제였습니다.

---

## 해결 방법 2. tsconfig references

그래서 `Project References`를 적용했습니다.

루트에서 프로젝트 관계를 명시했습니다.

```json
// tsconfig.json
{
  "files": [],
  "references": [{ "path": "apps/react-app" }, { "path": "packages/ui" }]
}
```

그리고 앱 프로젝트에서도 참조를 추가했습니다.

```json
{
  "references": [
    {
      "path": "../../packages/ui"
    }
  ]
}
```

처음에는 단순한 설정이라고 생각했습니다.

하지만 지금은 이렇게 이해합니다.

> “TypeScript에게 프로젝트 의존 관계를 알려주는 설정”

덕분에 타입 에러 문제도 해결할 수 있었습니다.

---

## 세 번째 문제: Next.js에서 서버/클라이언트 컴포넌트 충돌

다음 문제는 `Next.js`에서 발생했습니다.

처음에는 Typography처럼 서버 컴포넌트에서도 사용할 수 있는 컴포넌트를 만들었습니다.

그리고 단순히 이렇게 export 했습니다.

```ts
export * from './Typography';
export * from './Button';
```

그런데 문제가 생겼습니다.

`Button`은 `use client`가 필요한 컴포넌트였고,  
Typography는 서버에서도 사용 가능해야 했습니다.

하지만 실제 import 시에는 같은 entry를 바라보고 있었습니다.

```tsx
import { Typography } from '@repo/ui';
```

그 결과 서버 컴포넌트에서도 클라이언트 경계가 섞이며 에러가 발생했습니다.

처음에는

> “use client만 붙이면 되는 거 아닌가?”

라고 생각했습니다.

하지만 실제로는 아니었습니다.

---

## 해결 방법 3. server/client export 분리

제가 선택한 방법은 명확했습니다.

아예 entry를 분리했습니다.

```text
@repo/ui/server
@repo/ui/client
```

vite build도 나눴습니다.

```ts
lib: {
  entry: {
    client: "src/client/index.ts",
    server: "src/server/index.ts"
  }
}
```

그리고 package exports도 분리했습니다.

```json
"exports": {
  "./server": {
    "import": "./dist/server.mjs"
  },
  "./client": {
    "import": "./dist/client.mjs"
  }
}
```

덕분에 서버 컴포넌트는 서버 전용 컴포넌트만 가져오고,

```tsx
import { Typography } from '@repo/ui/server';
```

클라이언트 컴포넌트는 별도로 사용할 수 있게 됐습니다.

```tsx
import { Button } from '@repo/ui/client';
```

지금 생각하면 꽤 괜찮은 선택이었다고 생각합니다.

---

## 내가 처음에 잘못 이해했던 부분

처음에는 이렇게 생각했습니다.

> “pnpm workspace만 쓰면 알아서 다 연결되고 개발도 편해질 줄 알았다”

하지만 실제로는 아니었습니다.

`pnpm workspace`는 **패키지를 연결해주는 역할**에 가까웠습니다.

개발 경험까지 좋아지는 건 아니었습니다.

- build 순서
- 타입 의존성
- 실시간 개발 경험(HMR)
- Next.js 환경 대응

이런 문제들은 결국 직접 고민해야 했습니다.

---

## 그래서 왜 turborepo를 보게 되었을까?

pnpm workspace만으로도 충분히 모노레포를 구성할 수 있었습니다.

하지만 패키지가 늘어나고,

- build
- lint
- test
- dev

실행이 점점 복잡해졌습니다.

특히

> “shared 먼저 실행하고 app 실행”

같은 작업 흐름이 불편하게 느껴졌습니다.

그때 처음 `Turborepo`를 다시 보게 되었습니다.

다음 글에서는

> 왜 결국 `Turborepo`를 선택하게 되었는지

그 과정을 정리해보려고 합니다.
