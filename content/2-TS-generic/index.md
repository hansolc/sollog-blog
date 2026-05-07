---
emoji: 🧩
title: 'TypeScript - Generic'
date: '2024-10-20'
categories: featured-skills
---

## TypeScript를 처음 봤을 때

처음 TypeScript를 접했을 때는 솔직히 꽤 불편했다.  
단순한 함수 하나에도 타입을 붙여야 했고, 파일도 늘어나고, 신경 써야 할 것도 많아졌다.

그래서 처음에는 이렇게 생각했다.

> “그냥 타입만 붙이는 JavaScript 아닌가?”

그런데 실제로 프로젝트를 진행하면서 생각이 조금씩 바뀌기 시작했다.

---

## TypeScript를 계속 쓰게 된 이유

코드를 조금만 길게 작성해보니 확실히 느껴지는 지점이 있었다.

- IDE 자동완성이 훨씬 정확해지고
- 예상하지 못한 런타임 에러가 미리 잡힌다

특히, “이 코드가 이 타입이 맞나?”를 실행 전에 확인할 수 있다는 점이 생각보다 컸다.

이때부터 내가 이해한 TypeScript는 단순히 타입을 붙이는 도구가 아니라

> “런타임에서 터질 문제를 컴파일 타임에 끌어오는 도구”

에 가까웠다.

---

## 그런데 Generic은 왜 필요했을까?

문제는 여기서 끝나지 않았다.

TypeScript를 쓰다 보니 또 다른 고민이 생겼다.

- 타입을 명확하게 쓰면 재사용이 어렵고
- 재사용을 하려고 하면 any를 쓰게 된다

그리고 나도 자연스럽게 any를 쓰고 있었다.

처음에는 이렇게 생각했다.

> “any 쓰면 재사용되니까 괜찮은 거 아닌가?”

그런데 이건 TypeScript를 쓰는 의미를 거의 버리는 선택이었다.

이 시점에서 “타입을 유지하면서 재사용할 수 있는 방법”이 필요했고,  
그게 바로 Generic이었다.

---

## Generic을 처음 이해한 순간

처음에는 Generic이라는 단어부터 이해하려고 했다.

> Generic  
> 형용사: 포괄적인, 총칭의

사전적인 의미를 보고 나서야 조금 연결이 됐다.

그리고 개인적으로는 정의보다 코드 한 줄이 더 이해를 빠르게 만들어줬다.

내가 이해한 Generic은 결국 이거였다.

> “타입을 고정하지 않으면서, 그 타입을 그대로 유지하는 방법”

이제 코드로 보면 더 명확해진다.

```ts
function firstOrNull(array: string[]): string | null {
  return array.length === 0 ? null : array[0];
}

function firstOrNullInNumberArray(array: number[]): number | null {
  return array.length === 0 ? null : array[0];
}

function firstOrNull(array: any[]): any | null {
  return array.length === 0 ? null : array[0];
}
```

위 함수는

- 배열이 비어 있다면 null을, 그렇지 않을 경우 숫자가 담긴 배열에서는 첫번째 숫자를,
- 문자열이 담긴 배열은 첫번째 문자열을 리턴하는 함수를 작성하고 싶을 경우, 따로 함수를 작성하거나 명시
- any 타입을 사용할 경우 타입스크립트의 사용 목적이 사라지게 된다.

이렇게 타입별로 함수가 계속 늘어나게된다. 이를 Generic으로 해결할 수 있다!

```ts
function fistOrNull<T>(array: T[]): T | null {
  return array.length === 0 ? null : array[0];
}

const a = firstOrNull<string>(['a', 'b']); // string | null
const b = firstOrNull<number>([1, 2]); // number | null
```

- 타입을 고정하지 않음
- 호출 시점에 타입 결정

### 객체 구조에서도 동일하게 적용

위의 예시는 너무 간단하다. 하지만,

- 매개변수가 3개 이상일 경우에는?
- 객체형태일 경우에는?

TS의 Interfae, Type 키워드를 제네릭을 통해 사용가능하다. Interface을 제네릭으로 활용한 예시이다

```ts
interface Contact {
  name: string;
  email: string;
}

interface Form<T> {
  values: T;
  errors: {
    [K in keyof T]?: string;
  };
}

const contactForm: Form<Contact> = {
  values: {
    name: 'Bob',
    email: 'bob@someemail.com',
  },
  errors: {
    email: 'this must be',
  },
};
```

- 먼저 Form타입을 generic으로 T를 넘겨 주었다. 따라서 contactForm변수를 선언 할 때 T에 Contact 인터페이스를 넣어 재사용 가능하게 해주었다
- 여기서 [K in keyof T]는 T의 키 값들을 모두 나열하는 것이다. 즉, values의 구조를 기준으로 errors 구조를 자동 생성되었다.

**이렇게 타입 간 관계를 유지할 수 있다!**

## Generic 추가 기능

### Default 옵션 추가하기

Generic 타입에 디폴트 옵션을 추가 할 수 있다.

```ts
function firstOrNull<T = string>(array: T[]): T | null {
  return array.length === 0 ? null : array[0];
}
```

해당 함수의 제네릭에 T=string으로 디폴트로 지정 할 수 있다.

### Generic 조건 제한하기(extends)

```ts
interface Logable {
  log: () => void;
}

// extends 키워드로 Logable 확장
function logItems<T extends Logable>(items: T[]): void {
  items.forEach((item) => item.log());
}

const heading = {
  name: 'Heading',
  props: { text: 'Chapter 1' },
  log: () => console.log('Chapter 1 heading'),
};

const button = {
  name: 'Button',
  props: { text: 'Save' },
  trace: () => console.log('Save button'),
};

// button 에서 에러 발생!
logItems([heading, button]);
```

- `logItems` 함수에서 제네릭을 Logable 타입으로 `extends` 처리했다. 이 의미는 T는 반드시 log을 가져가야 한다.
- 마지막 줄 `button` 에서 에러가 발생한다!

오류가 발생하는 이유는 log라는 키를 포함하지 않아서이다. 이렇게 Generic에 조건을 부여할 수 있다.

---

### spread + Generic (추론 개선)

```ts
function logThings<T extends unknown[]>(name: string, ...things: T) {
  console.log(things.join(', '));
}

logThings('Bob', 4, '9', 3);
// 9에서 오류발생!
logThings<number[]>('Bob', 4, '9', 3);
```

- `unknown`: 아무 타입이나 받을 수 있지만, any처럼 무제한 허용하지 않음
  - any → 아무거나 가능 + 타입 무시
  - unknown → 아무거나 가능하지만 사용 전에 타입 체크 필요
- 마지막 줄 '9' 에서 오류가 발생한다

오류가 발생하는 이유는 이제 쉽게 알 것이다. number로 제네릭으로 명시했기 때문에 `9`는 문자열이라 오류가 발생한다.

## 마무리

제네릭을 설명하며 조금 쉬운 예제만 설명했다. 나도 이런 간단한 예제는 쉽게 설명하며 가능했지만 실제 실무에서 사용하려니 언제, 어떻게 사용해야 할지 막연했다. 나의 경험을 바탕으로는

### 써야할 경우

- 타입이 입력에 따라 달라지는 경우
- 함수/컴포넌트 재사용이 필요한 경우
- 데이터 구조 간 관계를 유지해야 할 때
  - ex) Form 상태관리, API 응답 타입

> 타입을 외부에서 받아야 한다면 Generic을 고려하자!

### 쓰지 말아야 하는 경우

- 타입이 고정된 경우
- 단순 로직인데 복잡도만 증가하는 경우

## REf

- [Understanding the types in JavaScript](https://learntypescript.dev/02/l1-js-types)
