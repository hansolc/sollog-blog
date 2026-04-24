---
emoji: 💡
title: 'Next.js App Router에서 TanStack Query SSR 제대로 쓰기'
date: '2026-04-24'
categories: featured-skills
---

> Next.js(App Router) + TanStack Query 조합을 바탕으로 쓴 글입니다.

> [공식 Advanced SSR 가이드](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) 를 처음부터 끝까지 읽고, 섹션마다 직접 라우트를 만들어 비교 실험해 보았습니다.

## 서버 상태 관리에 최적화된 Tanstack Query, SSR 환경에선?

그동안 TanStack Query를 쓰면서 "서버 상태 관리에 최적화된 도구"라는 장점은 체감했지만, 막상 Next.js App Router 환경에 들어오면 사용 방식이 늘 어정쩡했다.

- `prefetchQuery` + `HydrationBoundary` 템플릿을 복붙하고,
- 서버 컴포넌트 안에서 `await`이 blocking을 일으키는 건에 크게 신경쓰지 않고 dehydrate가 어떤 기능인지 모호하고,
- "streaming"이라는 단어는 많이 들었는데, 무엇이 어떻게 흐른다는 건지 정확히 설명하라고 하면 머뭇거렸다.

그래서 공식 Advanced SSR 가이드를 처음부터 읽으면서 **섹션별로 직접 라우트를 하나씩 만들어 비교해 보기로 했다.** 이 글은 그 과정에서 얻은 이해를 헤더 순서대로 다시 정리한 회고 기록이다. 같은 질문에 막혀 본 사람에게 단서가 되면 좋겠다.

---

## 0. 용어부터 짚고 가자

공식문서를 읽다 보면 단어가 모호하게 섞여 있어서, 내 기준으로 한 번 정리해 두고 시작한다.

- **Hydration**: 서버에서 직렬화해 보낸 쿼리 캐시(`dehydratedState`)를 클라이언트 `QueryClient`에 **주입/복원**하는 과정.
- **Dehydrate**: 서버의 `QueryClient`가 들고 있는 캐시 상태를 직렬화 가능한 스냅샷으로 변환하는 과정.
- **Streaming**: HTML을 한 번에 다 보내지 않고, 서버에서 준비되는 조각부터 브라우저에 흘려보내는 렌더링 전략.
- **Page transition**: 클라이언트 라우팅으로 페이지를 이동하는 것 (서버 왕복 없이 전환되는 케이스).

하나만 미리 이야기하면, App Router + TanStack Query 조합에서 "streaming"의 정체는 결국 **pending 상태인 Promise까지 dehydrate 해서 서버→클라이언트로 함께 흘려보낸다** 라는 한 문장으로 압축된다. 뒤에서 다시 다룬다.

---

## 1. Initial Setup — Provider 세팅

시작은 평범하다. `QueryClientProvider`를 최상단에 감싸는 것. 본 내용에서는 코드로만 간단히 보여주려 한다.
공식문서 그대로의 패턴이다.

```tsx
'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- 여기서 작지만 중요한 디테일: `staleTime`의 **기본값은 `0`** 이다.
- hydration 직후 쿼리가 즉시 stale 상태로 판정돼 `refetchOnMount`에 의해 바로 재요청된다는 뜻이다.

서버에서 기껏 prefetch 해 놓고도 클라이언트에서 한 번 더 네트워크를 태우는 상황이 여기서 나온다. 그래서 기본 staleTime을 0보다 크게 주는 설정이 "권장"이 아니라 "사실상 필수"에 가깝다.

---

## 2. Prefetching & de/hydrating — App Router의 이점

Pages Router 시절에는 prefetch 경로가 꽤 길었다.

1. `getServerSideProps` / `getStaticProps`에서 prefetch
2. `dehydratedState`를 page props로 내려주고
3. 페이지 컴포넌트 최상단에서 `HydrationBoundary`로 감싸기

App Router에서는 이 파이프라인이 많이 짧아진다.

```tsx
// app/posts/page.tsx (서버 컴포넌트)
export default async function PostsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsClient />
    </HydrationBoundary>
  );
}
```

서버 컴포넌트가 곧 데이터 fetch 지점이자 `HydrationBoundary`의 부모가 될 수 있으니, **props drilling 없이** 바로 dehydrate 결과를 꽂아 넣을 수 있다. 그리고 `PostsClient` 안에서 같은 `queryKey`로 `useQuery`를 호출하면, 첫 렌더에서 Network 탭에는 해당 요청이 **보이지 않는다**. 서버에서 이미 받아 놓은 캐시를 쓰는 거니까.

거꾸로 말하면, App Router라고 해서 보일러플레이트가 사라진 건 아니다. prefetch가 필요한 **모든 서브트리마다** `HydrationBoundary`를 감싸야 한다는 기본 구조는 그대로다. 이게 뒤에서 다룰 문제로 이어진다.

---

## 3. Nesting Server Components — Waterfall이 시작되는 지점

App Router의 장점 중 하나는 **서버 컴포넌트를 단위로 쪼갤 수 있다**는 점이다. 페이지 안에 `<Posts />`, `<Comments />` 각각을 서버 컴포넌트로 나누고, 각자의 prefetch를 각자가 책임지게 할 수 있다.

이때 두 가지 함정이 등장한다.

```tsx
// page.tsx
export default async function Page() {
  const queryClient = new QueryClient();

  // ⚠️ 문제 1) await는 현재 서버 컴포넌트를 blocking한다
  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
      <Comments /> {/* ⚠️ 문제 2) Comments 내부도 HydrationBoundary가 필요 */}
    </HydrationBoundary>
  );
}
```

### 문제 1: Waterfall

> **Waterfall**: 요청이 폭포수처럼 이어지는 현상. A가 끝나야 B가 시작되고, B가 끝나야 C가 시작되는 직렬 실행.

위 구조에서 `page.tsx`가 `await`으로 posts를 기다리는 동안, `<Comments />` 내부의 prefetch는 **시작조차 하지 못한다.** 실제로 직렬 실행 버전을 만들어 측정해 봤다.

```tsx
// app/streaming-blocking/page.tsx — 직렬 실행 버전
await queryClient.prefetchQuery({
  queryKey: ['posts-blocking'],
  queryFn: getPosts, // 약 2s
});
await queryClient.prefetchQuery({
  queryKey: ['comments-blocking'],
  queryFn: getComments, // 약 2s
});
// 총 소요 ≈ 4s
```

공식문서가 제시하는 해법은 두 가지다.

1. **Next.js [Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)** — 각 슬롯이 독립적으로 렌더되며 prefetch도 독립 실행
2. **`Promise.all` 로 묶어 병렬 prefetch** — 한 파일 안에서 해결

직접 써 본 체감으로는 `Promise.all`이 훨씬 가볍다. 라우트 구조를 건드리지 않고도 같은 이득을 얻는다.

```tsx
export default async function ParallelPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['posts-parallel'],
      queryFn: getPosts,
    }),
    queryClient.prefetchQuery({
      queryKey: ['posts-comments-parallel'],
      queryFn: getComments,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
      <Comments />
    </HydrationBoundary>
  );
}
```

같은 2초짜리 API 두 개 기준으로 측정해 보니 약 2배 차이(4초 → 2초)가 났다. 기대한 대로.

### 문제 2: HydrationBoundary 반복

서버 컴포넌트를 쪼갤수록 "각 서브트리가 자기 `HydrationBoundary`를 가진다"는 구조가 반복된다. 해결은 뒤에서 `ReactQueryStreamedHydration`을 다룰 때 이어진다.

---

## 4. 병렬로 바꿨는데도 여전히 멈춰 보이는 이유

"병렬 prefetch로 서버 시간을 2배 빨라지게 했다"로 끝날 줄 알았는데, 페이지 이동 시에 **여전히 화면이 멈춘 것처럼 보이는 순간**이 있었다.

이유를 정리하면 이렇다.

- 서버 컴포넌트 안의 `await Promise.all([...])`은 **그 페이지의 초기 HTML이 응답되기 전까지** blocking이다.
- Next의 클라이언트 라우팅(page transition)에서 이 페이지로 넘어가면, 이전 페이지는 그대로 유지된 채 **서버 응답을 기다리다가** 한 번에 교체된다. 사용자 입장에서는 "클릭했는데 아무 반응 없다가 갑자기 바뀌는" 경험이 된다.
- `loading.tsx`를 두면 전환 동안 로딩 UI를 보여줄 수는 있지만, 그건 **페이지 단위**의 해법이다. "이미 준비된 영역부터 먼저 보여주고, 느린 쿼리 자리만 로딩 표시" 같은 세분화된 UX는 여기서 막힌다.

이 지점에서 진짜 "streaming"이 필요해진다.

---

## 5. Streaming — pending 상태까지 dehydrate 하기

핵심은 한 줄이다.

> **`await`을 제거하고, pending 상태의 쿼리도 dehydrate 되게 만든다.**

v5.40 이상부터 지원되는 옵션으로, `dehydrate.shouldDehydrateQuery`를 확장하면 된다.

```tsx
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
      dehydrate: {
        // pending 상태의 쿼리도 함께 dehydrate
        shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldRedactErrors: () => false,
      },
    },
  });
}
```

이 설정이 켜진 상태에서, 서버 컴포넌트는 이렇게 쓰면 된다.

```tsx
// app/streaming-example/page.tsx — await 없이 prefetch만 시작
export default function StreamingPage() {
  const queryClient = getQueryClient();

  // ✨ await 없음. Promise만 등록하고 즉시 아래 JSX로 내려간다
  queryClient.prefetchQuery({
    queryKey: ['posts-streaming'],
    queryFn: getPosts,
  });
  queryClient.prefetchQuery({
    queryKey: ['comments-streaming'],
    queryFn: getComments,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>⏳ Posts 로딩 중...</p>}>
        <PostsList />
      </Suspense>
      <Suspense fallback={<p>⏳ Comments 로딩 중...</p>}>
        <CommentsList />
      </Suspense>
    </HydrationBoundary>
  );
}
```

일어나는 일을 시간순으로 풀어 보면 이렇다.

1. 페이지 렌더는 `await` 없이 **즉시** 반환 → 초기 HTML이 빠르게 나간다.
2. `dehydrate`는 아직 `pending` 상태인 쿼리(Promise)까지 스냅샷에 포함시킨다.
3. 브라우저는 서버로부터 이어지는 스트림을 받으며, 각 쿼리의 Promise가 **resolve 되는 순서대로** `<Suspense>` 경계가 하나씩 풀린다.
4. 결과적으로 "전체 응답 완료까지 blocking" 대신 **부분부터 점진 표시** 되는 UX가 나온다.

blocking 버전과 streaming 버전을 한 프로젝트에 같이 두고 비교했을 때, 콘솔 타임스탬프상 streaming 버전은 페이지 렌더 함수가 1ms 수준에서 끝나고, 사용자는 "첫 바이트가 도착하자마자 레이아웃이 보이는" 경험을 한다.

---

## 6. useQuery vs useSuspenseQuery — 언제 무엇을 쓰나

streaming까지 왔을 때 생기는 자연스러운 질문. 클라이언트 측은 무엇으로 받아야 할까.

짧게 결론부터.

- **`useQuery`**: 컴포넌트 내부에서 `isLoading`, `isError`로 직접 상태를 분기해서 UI를 그리고 싶을 때.
- **`useSuspenseQuery`**: 로딩/에러 UI를 **컴포넌트 외부**의 `<Suspense>` / `<ErrorBoundary>`에 위임하고 싶을 때. 그리고 **pending 상태 dehydration과 진짜로 맞물리는 훅이다.**

`useQuery`를 써도 동작은 한다. 다만 v5 기준으로 `useQuery`에서 `suspense: true` 옵션은 제거됐고, `useSuspenseQuery`가 그 역할을 전담한다. 서버에서 흘려보낸 pending Promise를 `<Suspense>` 경계가 자연스럽게 받아내려면 `useSuspenseQuery` 조합이 가장 매끄럽다.

```tsx
// PostsList.tsx
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';

export default function PostsList() {
  const { data } = useSuspenseQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });
  return <ul>{data.map(/* ... */)}</ul>;
}

// 부모
<Suspense fallback={<p>Posts 로딩 중...</p>}>
  <PostsList />
</Suspense>;
```

정리하면 — **각 컴포넌트마다 자체 로딩/에러 UI를 촘촘히 관리하고 싶다면 `useQuery`**, **상위 Suspense / ErrorBoundary 경계로 책임을 밀어올리고 싶다면 `useSuspenseQuery`.** SSR streaming 시나리오에서는 대부분 후자가 적합하다.

---

## 7. Alternative — `react.cache`로 단일 QueryClient 공유하기

> 꼬리질문 하나를 먼저 던지자. "서버 컴포넌트마다 `new QueryClient()`를 호출하면 같은 요청 안에서도 prefetch가 중복되는 거 아닌가?"

그럴 수도 있고, 아닐 수도 있다. `fetch` 기반 쿼리는 Next.js의 요청 단위 **dedup** 덕분에 같은 URL이면 실제 네트워크는 한 번만 나간다. 하지만 `axios` 등 다른 HTTP 클라이언트를 `queryFn` 안에서 쓰면 dedup이 걸리지 않는다.

공식문서가 제안하는 대안은 `React.cache`를 이용해 **한 요청(request) 안에서** `QueryClient`를 싱글톤처럼 공유하는 방법이다.

```tsx
// app/utils/tanstack-query.ts
import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

const getQueryClient = cache(() => new QueryClient());
export default getQueryClient;
```

이렇게 하면 `getQueryClient()`를 **서버 컴포넌트 트리 어디에서든**, 심지어 일반 유틸 함수 안에서도 호출할 수 있고 같은 인스턴스를 돌려받는다.

### 유틸 함수에서 이게 왜 쓸모 있지?

공식문서의 "_you can call `getQueryClient()` to get a hold of this client anywhere that gets called from a Server Component, including utility functions_" 부분이 처음엔 와닿지 않았다. 코드로 상상해 보면 이런 상황이다.

```tsx
// lib/prefetch-user.ts — 서버에서 재사용되는 prefetch 유틸
import getQueryClient from '@/app/utils/tanstack-query';
import { getUser } from '@/services/users';

export async function prefetchUser(userId: string) {
  const queryClient = getQueryClient(); // 같은 요청이면 같은 인스턴스
  await queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });
}

// app/posts/page.tsx
export default async function PostsPage() {
  await prefetchUser('me');
  // ...
  const queryClient = getQueryClient(); // ↑ prefetchUser와 동일 인스턴스
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsClient />
    </HydrationBoundary>
  );
}
```

여러 서버 컴포넌트/유틸에서 **같은 요청 동안 같은 캐시**를 공유할 수 있다는 점이 본질이다.

### 그럼 왜 기본값은 "새로 만들기"인가

대신 부작용이 있다. 하나의 `QueryClient`에 누적되는 모든 캐시가 **매 페이지의 `dehydrate`에 포함**되므로, 한 페이지에서는 쓸 일 없는 쿼리까지 wire로 흘려보내는 오버헤드가 생긴다. 스코프가 넓을수록 serialize 비용이 커진다.

즉 트레이드오프는 이렇다.

- 요청 단위 공유 / 유틸 재사용 우선 → `React.cache` 방식
- dehydrate 페이로드 최소화 우선 → 페이지마다 `new QueryClient()`

`fetch`로만 통신한다면 Next의 dedup이 있어서 "굳이 단일 인스턴스로 갈 이유"가 약해진다는 점도 같이 기억해 두면 좋다.

---

## 8. Data ownership and revalidation — out of sync를 언제 걱정해야 하나

공식문서는 "같은 데이터를 서버 컴포넌트와 클라이언트 컴포넌트 양쪽에서 렌더링하지 말라"고 한다. 이유가 바로 와닿지 않아서 한참 곱씹었다.

상황을 구체화하면 이렇다.

- 서버 컴포넌트가 `posts.length`를 직접 HTML로 그려 내려보내고,
- 같은 데이터를 클라이언트의 `<Posts />`가 `useQuery`로 받아 렌더한다.
- 시간이 흘러 `staleTime`을 지나면, 클라이언트는 `refetchOnMount` / `refetchOnWindowFocus` 등으로 **refetch** → 새 데이터로 리렌더된다.
- 서버 컴포넌트가 그려 놓은 HTML 숫자는 그대로다. 두 값이 **동시에 화면에 공존하며 서로 일치하지 않게** 된다.

### 그래서 얼마나 자주 터지나?

내 첫 반응은 "staleTime 크게 주면 되는 거 아닌가"였다. 사실 이게 절반 정답이다. TanStack Query v5의 `staleTime` 기본값은 **0** 이라서, 기본 설정 그대로라면 hydration 직후 바로 stale 판정이 나고 refetch가 한 번 발동한다. 이게 out of sync의 1차 발생 경로다. `staleTime: 60 * 1000` 정도만 줘도 이 경로는 거의 사라진다.

그래도 공식문서가 단호하게 "분리하라"고 하는 이유는, **포커스 복귀 / 네트워크 회복 / 수동 invalidate** 등 refetch를 유발하는 트리거가 staleTime과 무관하게 존재하기 때문이다. 그런 순간이 오면 서버 HTML은 뒤처진 숫자를 계속 보여주게 된다.

그래서 실전 가이드라인은 이렇게 나뉜다.

1. **서버 + 클라이언트 혼용** → 서버는 **prefetch만** 하고 렌더는 클라이언트 컴포넌트에 맡긴다. (가장 자주 쓰게 되는 패턴)
2. **서버만 사용** → `fetchQuery`로 서버에서 직접 받아 HTML로만 렌더. (데이터가 정적이거나 revalidate가 불필요한 경우)
3. **클라이언트만 사용** → 익숙한 CSR 패턴 그대로.

핵심은 **"같은 데이터를 서버 HTML과 클라이언트 캐시 둘 다에서 렌더해 소유권을 쪼개지 말 것"** 이다.

---

## 9. Persist Adapter를 같이 쓸 때의 함정

`PersistQueryClientProvider`는 쿼리 캐시를 `localStorage` 같은 영구 저장소에 저장해 둬서, 새로고침 후에도 캐시를 그대로 이어 쓰게 해 주는 기능이다.

Streaming 설정과 함께 쓰면 문제가 한 줄로 요약된다.

> **Streaming을 위해 `pending` 쿼리까지 dehydrate 하도록 바꿔 놨는데, persist도 그 기준을 따라 pending Promise를 `localStorage`에 저장하려 한다. 직렬화할 수 없는 값을 저장하려다 깨지거나 쓸모없는 값이 남는다.**

해법은 간단하다. persist 쪽에는 **streaming용 확장이 아닌 기본 `shouldDehydrateQuery`** 를 따로 넘긴다.

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: defaultShouldDehydrateQuery, // 기본값 = pending 제외
    },
  }}
>
  {children}
</PersistQueryClientProvider>
```

"서버→클라이언트 전송을 위한 dehydrate"와 "영구 저장을 위한 dehydrate"의 기준을 **분리해서** 관리하는 게 포인트다.

---

## 10. Streaming with Server Components — out of sync 실제 예시

공식문서에서 이 섹션은 "서버 컴포넌트에서 미리 받은 값을 서버가 직접 렌더하면서, 자식 클라이언트 컴포넌트도 같은 쿼리를 쓰는 경우"를 경고한다.

```tsx
export default async function PostsPage() {
  const queryClient = new QueryClient();

  const posts = await queryClient.fetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>Nr of posts: {posts.length}</div> {/* 서버 HTML에 박힌 값 */}
      <Posts /> {/* 클라에서 useQuery로 같은 queryKey 구독 */}
    </HydrationBoundary>
  );
}
```

여기서 `<Posts />`가 나중에 refetch 되면, 상단의 `Nr of posts: N` 은 그대로인데 아래 목록만 새 값을 보여주는 "시각적 불일치"가 생긴다. 8번에서 이야기한 규칙이 그대로 적용된다 — **서버는 prefetch만, 렌더는 클라이언트에게**.

---

## 11. Experimental — `ReactQueryStreamedHydration`

지금까지 정리한 흐름을 다시 보면, streaming을 쓰기 위해 해야 하는 일이 꽤 많다.

1. Provider에 `shouldDehydrateQuery`로 pending 포함
2. 서버 컴포넌트마다 `prefetchQuery` (병렬 처리 고려)
3. 서브트리마다 `HydrationBoundary`
4. 클라이언트에서 `<Suspense>` + `useSuspenseQuery`

실험적 기능인 `@tanstack/react-query-next-experimental`의 `ReactQueryStreamedHydration`은 이 중 **2번과 3번을 제거**해 준다. Provider 밑에 한 번 감싸 두기만 하면 된다.

```tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
    </QueryClientProvider>
  );
}
```

그 다음, 순수 클라이언트 컴포넌트에서 `useSuspenseQuery`만 써도 **서버 렌더링 경로에서 자동으로 fetch가 시작되고**, pending Promise가 클라이언트로 스트리밍된다. 별도의 `prefetchQuery`도, `HydrationBoundary`도 필요 없다.

```tsx
// 서버 컴포넌트 — prefetch 없이 그냥 Suspense만
export default function Page() {
  return (
    <Suspense fallback={<p>⏳ Posts 로딩 중...</p>}>
      <PostsList /> {/* 'use client' + useSuspenseQuery */}
    </Suspense>
  );
}
```

### 그럼 왜 아직 실험 단계일까 — waterfall 이야기

직접 `experimental-server-demo`, `experimental-streaming` 라우트를 만들어 로그를 뜯어 보고 나서 내 이해가 이렇게 고쳐졌다.

- 같은 부모 아래 **형제** 관계의 `useSuspenseQuery`들은 보통 **같은 렌더 패스에서 거의 동시에** fetch가 시작된다. 이 경우만 보면 수동 `Promise.all`과 큰 차이가 없다.
- 문제는 **Suspense 경계가 중첩될 때**다. 바깥 Suspense가 자기 쿼리를 resolve해야 안쪽 컴포넌트가 렌더되고, 그때서야 안쪽 `useSuspenseQuery`가 발사된다. 여기서 진짜 waterfall이 생긴다.
- 반대로 서버 컴포넌트에서 명시적으로 `Promise.all([prefetchQuery, prefetchQuery])`를 쓰면, 아직 **자식이 렌더되기 전**에도 모든 prefetch가 동시에 출발해 있다. 이 차이가 크다.

정리하면, `ReactQueryStreamedHydration`은 **보일러플레이트를 극적으로 줄여 주는 대신, 병렬성의 책임을 "컴포넌트 트리의 모양"에 떠넘긴다.** 성능이 중요한 루트에서는 여전히 서버 컴포넌트 + 명시적 `Promise.all`이 안전한 선택지다.

---

## 마무리 — 뭘 얻고 무엇이 남았나

처음 질문은 단순했다. "TanStack Query를 App Router에서 제대로 쓴다는 게 뭘까?" 직접 라우트를 여러 개 만들어 비교해 보면서 내 안에서 정리된 답은 이 정도다.

- **Pages Router 대비 개선점**: props drilling 없이 서버 컴포넌트 안에서 바로 `prefetchQuery` → `dehydrate` → `HydrationBoundary`로 이어지는 경로. 대신 서브트리마다 Boundary를 감싸야 하는 반복은 남아 있음.
- **Blocking을 피하는 법**: 서버에서 `await`를 쓰지 않고 prefetch만 등록 + pending 상태 dehydrate. 이게 "App Router에서의 streaming"의 실체.
- **병렬화**: 수동으로 해야 한다면 `Promise.all` 또는 Parallel Routes. `ReactQueryStreamedHydration`은 편하지만 트리 모양에 따라 waterfall이 생길 수 있다.
- **Out of sync**: 서버와 클라이언트가 **같은 데이터를 동시에 렌더**하지 않게 소유권을 나누는 게 가장 안전. 보통은 "서버는 prefetch, 클라는 렌더".
- **단일 `QueryClient` 공유**: `React.cache` + 유틸 함수 재사용 시에 유리하지만, dehydrate 페이로드가 커지는 트레이드오프가 있다.
- **Persist Adapter와의 궁합**: streaming용 dehydrate 옵션과 persist용 dehydrate 옵션을 **분리**할 것.

이제 TanStack Query + App Router 조합을 마주했을 때, "어느 상황에 어떤 도구를 쓰는 게 맞다"가 어느 정도 말로 설명되는 상태가 됐다. 앞으로 실제 프로젝트에서는 UX 요구 사항(초기 blocking 허용 여부, 부분 노출 필요 여부)과 데이터 소유권 경계를 먼저 정한 뒤, 이 글에서 정리한 선택지 중 하나를 고르는 식으로 쓸 생각이다.

---

## Ref

- [TanStack Query — Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Query — Streaming (Experimental)](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#experimental-streaming-without-prefetching-in-nextjs)
- [Next.js — Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)
