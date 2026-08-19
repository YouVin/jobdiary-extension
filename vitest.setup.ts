// content script(saramin/jobkorea/wanted.ts)는 모듈 로드 시점에
// registerCollectHandler → chrome.runtime.onMessage.addListener를 호출한다.
// jsdom 테스트 환경엔 chrome 전역이 없어 파서 함수(parseSaramin 등)를 import하는
// 것만으로도 그 시점에 바로 에러가 나므로, import가 죽지 않을 만큼의 최소 스텁을 채워둔다.
// 실제 chrome.storage 동작을 검증하는 테스트는 이 스텁의 대상이 아니다.
globalThis.chrome = {
  runtime: {
    onMessage: { addListener: () => {} },
    onMessageExternal: { addListener: () => {} },
  },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {},
      remove: async () => {},
    },
  },
} as unknown as typeof chrome
