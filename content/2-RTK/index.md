---
emoji: 🧰
title: 전역상태 관리 RTK(Redux Toolkit)
date: 2026-05-03
categories: featured-skills
---

## 전역상태 관리

React을 사용한다면 "상태 관리"를 직면하게 된다. 그리고 React는 데이터가 단방향으로 흐른다.

따라서, 특정 부모 컴포넌트에서 한단계는 괜찮지만 여러 단계를 거칠 때 props을 매번 전달해 줘야 하는 `props drilling` 문제에 직면하게 된다.

```tsx
<Parent>
  <A user={user}>
    <B user={user}>
      <C user={user} />
    </B>
  </A>
</Parent>
```

이 문제를 해결하기 위해 React는 Context API가 내장되어 있다.

그럼 이 Context API 을 사용하지 않고 전역상태 관리 라이브러리를 사용하는 이유는 무엇일까?

## 성능 개선을 위한 전역 상태 관리 라이브러리

Context API의 가장 큰 장점으로는

- props drilling 효과를 방지
- React 내장 도구로 별도 외부 라이브러리를 설치하지 않아도 된다.

그래서 개인 프로젝트를 할 때 특별한 이유가 없으면 기본 context api 을 사용했다. 그럼 왜 다들 외부 라이브러리를 사용하는 걸까?

```tsx
<AppContext.Provider value={{ user, theme }}>
```

이 구조에서 theme만 바뀌어도 user를 사용하는 컴포넌트까지 전부 리렌더링된다.

처음에는 \*React.memo로 해결할 수 있을 줄 알았다. 하지만 Context를 직접 구독하는 구조에서는 이게 근본적인 해결이 아니었다.

> \*React.memo
> 부모 컴포넌트에서 리렌더링이 발생 하더라도 자식 컴포넌트의 props가 변경되지 않으면 리렌더링을 실행하지 않는다.

- 필요한 상태만 구독하기 어렵고
- 성능 최적화를 컴포넌트마다 신경 써야 한다.

## 전역 상태관리: Redux

### redux vs Context API

- top-down 방식
- Flux 패턴이다.

그리고 Context API 와의 차이로는

- 어떤 액션인지 명확
- reducer에서 상태 변경 로직이 한 곳에 모임
- 흐름이 추적 가능 이다.

### 전역 상태관리: Redux

첫 실무에서는 redux을 사용했다. 사실 다른 전역 상태관리 라이브러리를 사용해 보지 못했으며 redux로 이미 프로젝트가 셋팅 되었기에 큰 불편함은 느끼지 못했다.

하지만 지금와서 느낀 점은 redux을 사용할 때 여러 나눠진 파일들을 관리해야 했다

1. Action Type 파일
2. Action Creater
3. reducer

이렇게 기능이 추가될 때 마다 새로운 reducer을 만들고 3개의 파일로 분리해 관리했다. 코드로 예시를 들어보자면

```ts
// action
const LOGIN = 'LOGIN';

// action creator
const login = (data) => ({
  type: LOGIN,
  payload: data,
});

// reducer
function reducer(state, action) {
  switch (action.type) {
    case LOGIN:
      return { ...state, user: action.payload };
  }
}
```

#### redux-toolkit

RTK는 `createSlice`로 이 과정을 하나의 파일로 관리할 수 있도록 지향하게 했다.

```ts
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.profile = action.payload;
    },
  },
});
```

- Action Type을 자동 생성
- 하나의 파일로 reducer와 action을 관리

이것 만으로도 많은 코드양이 줄어들었다.

### 비동기 처리

기존 redux에서는 비동기 처리를 위해 action creator에서 따로 처리해 주었다.

```ts
// 잘 기억나지 않음
// 너가 기존 redux에서 어떻게 사용했을 지 한번 예상해줘
// 사용하는곳과 action creator부분을 코드로 보여줘
const login = async (data) => ({
    return new Promise({
        type: LOGIN,
        payload: data
    })
})
```

RTK는 `createAsyncThunk` 로 해결된다.

```ts
const getUserInfo = createAsyncThunk('user/getUserInfo', async (token: string) => {
  const res = await getUserAPI(token);
  return res.data;
});

// slice에서 다음과 같이 처리
extraReducers: (builder) => {
  builder.addCase(getUserInfo.fulfilled, (state, action) => {
    state.profile = action.payload;
  });
};
```

[이렇게 보면 redux와 rtk의 비동기 처리 방식의 차이를 잘 이해 못하겠네. 너가 다시 설명해줘]

## 마무리

처음에는 redux을 이렇게 생각했다.

> 프로젝트 규모가 클 수록 redux을, 그렇지 않을 경우 Context API 사용

틀린말은 아니지만 이제 이렇게 설명할 수 있다.

- 상태 변경 흐름을 통제하고 예측 가능하게 한다. 상태 흐름이 복잡해질 가능성이 있다면 규모와 상관없이 도입 고려 가능하다
  - [이게 잘 이해 안감 코드로 예시 추가 부탁. Context API에서는 왜 이게 안되는지, 그리고 redux에서는 어떻게 이게 가능한지]
- 구독되지 않은 컴포넌트에 대한 리렌더링을 방지해 성능을 개선한다
- 보일러 플레이팅 코드를 줄이고, DX 개선을 위해 Redux Toolkit 또한 좋은 선택지 이다
- 상태 흐름이 복잡한 경우
- 여러 컴포넌트에서 상태를 공유해야 하는 경우
- 상태 변경을 추적/디버깅해야 하는 경우

현재 내가 전역상태 관리를 사용하는 방법은 다음과 같다

- 디자인 시스템과 같이 컴포넌트 내에서만 사용될 때: Context API
- 서버 상태관리: Tanstack Query
- 복잡한 상태 흐름: Redux, zustands
