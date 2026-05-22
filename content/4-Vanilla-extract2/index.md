---
emoji: 🎨
title: 'Vanilla Extract(Zeroruntime)에서 동적 스타일링 하기'
date: '2025-03-25'
categories: featured-skills
---

> 런타임 성능을 개선하는 CSS: Vanilla-extract/css 포스트의 연장 글입니다.

1편에서 `vanilla-extract`가 왜 **Zero-runtime CSS**를 지향하는지 정리했다.

하지만 실제로 사용하다 보니 새로운 의문이 생겼다.

> “정적인 CSS를 지향한다면 동적 스타일링은 어떻게 처리하지?”

특히 디자인 시스템을 만들다 보니 이 문제가 꽤 현실적으로 다가왔다.

---

## Grid 컴포넌트를 만들다 보니 고민이 생겼다

처음에는 이렇게 생각했다.

> “디자인 토큰만 잘 정의하면 동적 스타일링은 필요 없지 않을까?”

실제로 spacing이나 layout 규칙이 명확하다면 `sprinkles`만으로도 충분하다.

예를 들어 column 개수가 고정되어 있다면:

```ts
gridTemplateColumns: {
  1: 'repeat(1, 1fr)',
  2: 'repeat(2, 1fr)',
  3: 'repeat(3, 1fr)',
}
```

이렇게 토큰처럼 관리하면 된다.

그런데 실제로 Grid 컴포넌트를 만들다 보니 상황이 달랐다.

내가 원했던 요구사항은:

- 반응형별 다른 column 개수
- row / column gap 자유 설정

이었다.

```tsx
<GridContainer
  column={{
    desktop: 4,
    tablet: 2,
    mobile: 1,
  }}
  gap={{
    col: 40,
    row: 40,
  }}
>
```

이렇게 자유롭게 사용하고 싶었다.

문제는 이런 값을 모두 `sprinkles`에 미리 등록하기 시작하면 오히려 관리 비용이 커진다는 점이었다.

그때 다시 보게 된 것이 `createVar`와 `assignInlineVars`였다.

---

## createVar와 assignInlineVars

내 기준에서 이해한 방식은 이렇다.

> “CSS 변수는 미리 선언하고, 실제 값만 런타임에 주입하는 방식”

`createVar()`는 CSS 변수를 만든다.

```ts
export const gridVar = {
  columns: {
    desktop: createVar(),
    tablet: createVar(),
    mobile: createVar(),
  },
};
```

그리고 스타일에서는 변수를 참조한다.

```ts
export const container = style({
  'display': 'grid',

  '@media': {
    [vars.media.desktop]: {
      gridTemplateColumns: `repeat(${gridVar.columns.desktop}, minmax(auto, auto))`,
    },
  },
});
```

실제 값은 사용하는 곳에서 넣는다.

```tsx
const GridContainer = ({ column, gap, children }: GridColumnProps & PropsWithChildren) => {
  return (
    <div
      className={container}
      // assingInlineVars 사용!
      style={assignInlineVars({
        [gridVar.columns.desktop]: column.desktop.toString(),
        [gridVar.columns.tablet]: column.tablet.toString(),
        [gridVar.columns.mobile]: column.mobile.toString(),
        [gridVar.gap.col]: gap.col.toString() + 'px',
        [gridVar.gap.row]: gap.row.toString() + 'px',
      })}
    >
      {children}
    </div>
  );
};

// 사용시
<GridContainer
column={{ desktop: 4, tablet: 2, mobile: 1 }}
gap={{ col: 40, row: 40 }}
>
```

> 즉, 스타일 자체를 런타임에 생성하지 않고, 값만 주입하는 구조

라고 이해했다.

---

## Theme 설정도 비슷했다

구조는 단순했다.

> “형식을 먼저 계약하고 실제 값을 주입하는 방식”

```ts
export const vars = createGlobalThemeContract({
  colors: {
    accent: {
      'accent/1': '',
      'accent/2': '',
    },
  },
});
```

그리고 실제 theme 값을 연결한다.

```ts
createGlobalTheme(':root', vars, {
  colors: {
    accent: {
      'accent/1': 'black',
      'accent/2': 'white',
    },
  },
});
```

나는 `createGlobalThemeContract`를 선택했다.

모노레포 디자인 시스템을 만들다 보니 DevTools에서 CSS 변수명이 명확하게 보이는 게 유지보수에 훨씬 편했기 때문이다.

(createThemeContract는 vanilla-extract가 CSS 변수명을 자동 생성한다.)

---

## selectors는 가장 낯설었다

솔직히 말하면 이 부분이 가장 불편했다.

나는 SCSS와 styled-components를 오래 사용해서 이런 방식이 익숙했다.

```scss
.wrapper {
  > div:first-child {
    color: red;
  }
}
```

그런데 vanilla-extract는 내 입장에서는 반대였다.

자식에서 부모를 참조해 스타일링을 정의했다.

```ts
export const parent = style({});

export const child = style({
  selectors: {
    [`${parent} &`]: {
      color: 'red',
    },
  },
});
```

처음에는 부모에서 자식을 직접 선택하지 못하는 점이 불편했다.

하지만 실제로 생각해보면 부모가 자식 스타일을 직접 덮어쓰는 구조에서는 자식 컴포넌트의 스타일이 어디서 바뀌는지 추적하기 어렵다.

반대로 vanilla-extract 방식처럼 자식 스타일 안에서 `${parent} &` 형태로 선언하면, 해당 스타일이 어떤 부모 컨텍스트에서 달라지는지 자식 스타일 파일 안에서 확인할 수 있다.

즉, 부모가 자식 구현을 몰라도 되고, 자식은 자신의 변화 조건을 스스로 가진다. 이 점에서 스타일 의존성이 줄고 예측 가능한 구조에 가까워진다고 이해했다.

추가로 SVG 커스터마이징처럼 구조적으로 접근하기 어려운 경우엔 `globalStyle`을 사용했다.

```ts
globalStyle(`${logo} > g`, {
  fill: 'black',
});
```

---

## 마무리

vanilla-extract/css의 핵심은:

> “동적 스타일링을 하지 않는 게 아니라, 런타임 CSS 생성을 최소화하는 방식”

라고 생각한다.

물론 styled-components에 비하면 동적 스타일링 구현은 조금 더 번거롭다고 생각한다.

하지만 그만큼 디자인 시스템과 정적인 스타일 구조를 강제하는 방향성은 명확하다고 느꼈다.

---

지금 내 기준은 이렇다.

### 사용할 때

- 디자인 시스템 중심 프로젝트
- 정적인 스타일 비중이 높을 때
- 디자인 토큰을 타입으로 강제하고 싶을 때
- Next.js App Router 환경

### 굳이 사용하지 않을 때

- 빠른 프로토타이핑이 중요한 프로젝트
- CSS-in-JS 생산성이 더 중요한 경우

결국 지금은 이렇게 판단한다.

> “정적인 스타일을 타입 안정성과 함께 구조적으로 관리하고 싶다면 좋은 선택지”

## Ref

- [Can i set dynamic props as raw value of styling - Git Discussion](https://github.com/vanilla-extract-css/vanilla-extract/discussions/1098)
- [vanilla-extract 공식문서](https://vanilla-extract.style/)
