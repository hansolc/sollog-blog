---
emoji: 🎨
title: '런타임 성능을 개선하는 CSS: Vanilla-extract/css'
date: '2025-03-18'
categories: featured-skills
---

## styled-components 사용하게 된 이유

처음 React를 사용했을 때는 순수 CSS를 사용했다.

하지만 프로젝트 규모가 커질수록 불편한 점이 많아졌다.

- className을 문자열로 관리해야 하고
- JS와 CSS 파일이 분리되어 있고
- 오타가 나도 IDE가 잡아주지 못했다

그래서 자연스럽게 SCSS를 사용하게 됐다.

SCSS를 사용하면서는 꽤 만족했다. mixin, include, 중첩 스타일링 덕분에 스타일 재사용성이 좋아졌고, 코드도 훨씬 읽기 편해졌다.

하지만 여전히 아쉬운 부분이 있었다.

- JS와 CSS가 분리되어 있다는 점
- 문자열 기반 className 관리
- 컴포넌트 단위 추상화의 한계

그러다 styled-components를 사용하게 됐다.

```tsx
const Wrapper = styled.div`
  display: flex;
`;
```

- 컴포넌트 단위 스타일링
- props 기반 동적 스타일링
- JS 안에서 스타일 관리

특히 React 컴포넌트와 스타일이 같이 존재하는 구조가 꽤 직관적으로 느껴졌다.

하지만 Next.js App Router를 사용하면서 생각이 조금 바뀌기 시작했다.

---

## 서버 컴포넌트에서의 제약

Next.js에서 Styled-components을 처음 사용할 때 다음 화면을 마주했을 것이다.

![](1-0.png)

Next.js App Router에서는 기본적으로 서버 컴포넌트가 사용된다.

styled-components 자체가 서버 렌더링이 안 되는 것은 아니다.

다만 App Router 환경에서는 StyledComponentsRegistry를 Client Component로 등록해야 하고, styled-components를 사용하는 영역은 Client Component boundary 안에서 관리해야 했다.

물론 컴포넌트를 분리하면 충분히 해결 가능한 문제였다.

CSR 중심 프로젝트에서는 여전히 생산성이 높고, props 기반 동적 스타일링도 매우 강력하다.

다만 내가 Next.js App Router 기반에서 서버 컴포넌트를 적극 활용하려다 보니 조금씩 구조적인 제약처럼 느껴지기 시작했다.

추가로 Next.js 환경에서는 설정도 필요했다.

- next.config.js 설정
- StyledComponentsRegistry 등록

공식문서에서도 App Router 환경에서는 registry 설정이 필요하다고 설명한다.

개인적으로는 이 시점부터 이런 생각이 들었다.

“서버 컴포넌트와 더 잘 맞는 스타일링 라이브러리는 없을까?”

그러다 보게 된 게 vanilla-extract/css였다.

---

## vanilla-extract/css

### Zero-runtime CSS

솔직히 처음엔 크게 와닿지 않았다.

하지만 내부 동작을 이해하고 나서야 왜 강조하는지 알게 됐다.

styled-components는 **런타임에 CSS를 생성**한다.

즉, 렌더링 시점에 props 기반으로 CSS 문자열을 만들고 스타일을 주입한다.

반면 vanilla-extract는 **빌드 시점에 CSS 파일을 미리 생성**한다.

런타임에서는 이미 생성된 className만 사용한다.

내가 이해한 기준은 이랬다.

> “JS처럼 작성하지만 결과물은 정적인 CSS 파일을 만드는 방식”

```ts
export const wrapper = style({
  display: 'flex',
});
```

코드는 TS처럼 작성하지만 실제 결과는 정적인 CSS 파일이다.

이 구조 덕분에:

- 런타임 스타일 생성 비용이 없고
- JS 번들에 스타일 생성 로직이 포함되지 않으며
- 서버 컴포넌트 환경에서도 자연스럽게 사용할 수 있었다

이 부분에서 개인적으로 vanilla-extract의 방향성이 이해되기 시작했다.

### 내가 처음에 헷갈렸던 CSS-in-TS

처음엔 이런 의문이 들었다.

> “styled-components도 TypeScript 타입 지원 되는데, 왜 vanilla-extract만 CSS-in-TS라고 하지?”

예를 들어 styled-components도 충분히 타입 안정성을 만들 수 있다.

```tsx
const Button = styled.button<{
  bg: keyof typeof colors;
}>`
  background: ${({ bg }) => colors[bg]};
`;
```

이렇게 하면 허용된 토큰만 사용할 수 있고 잘못된 값은 컴파일 단계에서 막힌다.

그래서 처음에는 둘의 차이를 잘 이해하지 못했다.

하지만 핵심 차이는 **타입 안정성 자체가 아니라 스타일 생성 시점**이었다.

- CSS-in-JS → 런타임에 CSS 생성
- CSS-in-TS → 빌드 시 CSS 생성

공식문서에서도 이렇게 설명한다.

> All styles generated at build time — just like Sass, LESS, etc, but with the power of TypeScript.

결국 내가 이해한 기준은 이랬다.

> “SCSS처럼 정적인 CSS를 만들되, TypeScript의 타입 시스템을 적극 활용하는 방식”

## Sprinkles를 보면서 Tailwind가 떠올랐다

공식문서에서도 TailwindCSS을 언급한다.

내 기준에서는 이렇게 이해했다.

> “Tailwind의 장점을 가져오면서 팀 규칙을 타입으로 강제하는 구조”

예를 들어 spacing 토큰을 정해놓는다고 가정해보자.

```ts
const responsiveProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: {
      '@media': 'screen and (min-width: 768px)',
    },
    desktop: {
      '@media': 'screen and (min-width: 1024px)',
    },
  },

  properties: {
    paddingTop: ['0rem', '4rem', '8rem'],
    paddingBottom: ['0rem', '4rem', '8rem'],
  },

  shorthands: {
    py: ['paddingTop', 'paddingBottom'],
  },
});
```

처음에는 그냥 Tailwind 대체품 정도로 생각했다.

하지만 실제로 사용해보니 더 중요한 건 **“허용한 디자인 토큰만 쓰게 강제한다”**는 점이었다.

```ts
sprinkles({
  py: {
    mobile: 'sm',
    tablet: 'md',
    desktop: 'lg',
  },
});
```

정의되지 않은 값을 사용하면 컴파일 단계에서 바로 막힌다.

```ts
mx: 'maxlg'; // 타입 에러
```

TailwindCSS는 정해둔 규칙을 따라야 했고 문자열로 관리되기에 오타가 발생해도 컴파일 에러를 발생시키지 않았다.

하지만 Sprinkles는 디자인 시스템 규칙 자체를 타입으로 제한할 수 있다는 점에서 꽤 인상적이었다.

## Recipe: 디자인 시스템에 적용하기

디자인 시스템 기반 Button을 만들다 보니 문제가 생겼다.

- variants: filled | elevate | outlined | tonal
- size: sm | md | lg

각 디자인 토큰별 다른 스타일링이 적용되어야 했다.

### 스타일 조합을 구조적으로 관리하기

recipe는 크게 4가지 속성을 가진다.

- base
- variants
- compoundVariants
- defaultVariants

### base

base는 말 그대로 공통 스타일이다.

```ts
base: [
  {
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
],
```

버튼 타입과 관계없이 항상 들어가야 하는 스타일을 정의한다.

### variants

```ts
variants: {
  variants: {
    filled: [],
    outlined: [],
    tonal: [],
  },
},
```

variants는 스타일의 상태 조합을 정의한다.

사용시에는 정의한 키 값을 props로 넘겨주면 된다.

```tsx
<Button variants="filled" />
<Button variants="outlined" />
```

처음에는 단순 스타일 분기 정도로 생각했는데, 실제로는 “컴포넌트 상태를 타입 기반으로 관리하는 구조”에 가까웠다.

### defaultVariants

variants에서 정의한 기본 값을 정의한다.

```ts
defaultVariants: {
  size: 'sm',
  shape: 'round',
  variants: 'filled',
},
```

결국

```tsx
<Button />
```

이렇게만 사용해도 기본 디자인 규칙을 유지할 수 있다.

### compoundVariants

compoundVariants는 이런 “특정 조합에서만 필요한 스타일”을 구조적으로 관리할 수 있었다.

예를 들어:

- round shape
- sm size

조합에서는 radius가 달라야 했다.

```ts
{
  variants: { shape: 'round', size: 'sm' },
  style: {
    borderRadius: staticVars.shape.corner.full,
  },
}
```

### RecipeVarianst

처음에는 variants 타입도 직접 선언하려 했다.

```ts
variants: 'filled' | 'outlined' | 'text';
```

하지만, 직접 선언할 경우 오타에 대한 실수와 새로운 variants가 추가될 때 마다
두개의 파일의 수정이 필요했다.

그런데 RecipeVariants를 사용하면 recipe에 정의한 variants 기준으로 타입이 자동 추론된다.

```ts
export type ButtonStyleProps = Required<NonNullable<RecipeVariants<typeof Button>>>;
```

Required, NonNullable 유틸 타입을 사용한 이유는 RecipeVariants는 optional 기반 타입으로 생성된다.
즉,

```ts
variants?: 'filled' | 'outlined';
```

이런 형태가 된다.

props가 명확하게 드러나야 하기 때문에 유틸타입을 추가해 주었다.

참고가 필요하다면 아래 recipe와 sprinkles를 작성한 전체 코드이다.

- [Sprinkles Code](https://github.com/hansolc/hds-monoreppo/blob/develop/packages/tokens/src/sprinkles/sprinkles.css.ts)
- [Recipe Code](https://github.com/hansolc/hds-monoreppo/blob/develop/packages/base-ui-design-system/src/components/Button/Button.css.ts)

## 마무리

그러나 vanilla-extract가 항상 정답이라고 생각되진 않는다
build 타입에 정적인 css을 생성해야하니 build 시간은 더 오래걸릴것이라 생각되고
vanilla-extract도 동적 스타일링에 대한 대응은 가능하다
내가 개인적으로 생각하는 단점으로는

- css selectors인 중첩 스타일링 복잡
- 동적 스타일링 복잡

이었다

결국 이 글을 통해 내 기준은 다음과 같이 판단한다

- 서버 컴포넌트를 적극 활용
- 런타임 비용 최적화
- 디자인 시스템 중심 구조인지

다음 글에서는 실제로 사용하며 가장 헷갈렸던 부분인

- createVar
- assignInlineVars
- css Selector
- createTheme

등 동적 스타일링, 중첩 스타일링, 테마 구조에 대해 정리해 보려 한다.

## REf

- [vanilla-extract/css 공식문서](https://vanilla-extract.style/documentation/getting-started)
- [styled-components 공식문서](https://styled-components.com/docs/advanced#server-side-rendering)
