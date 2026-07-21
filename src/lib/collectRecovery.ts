const CONNECTION_ERROR_SNIPPET = 'Could not establish connection';

// chrome.tabs.sendMessage가 "리시버 없음"으로 실패했을 때 던지는 에러인지 판별한다.
// SPA 라우팅/확장 리로드로 content script가 그 탭에 미주입된 상태를 구분하기 위해 쓴다.
export function isConnectionError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(CONNECTION_ERROR_SNIPPET);
}

// 지정한 탭이 'complete' 상태가 될 때까지 기다린다 (새로고침 후 로드 완료 대기용).
// 타임아웃 안에 도달 못 해도 reject하지 않고 그냥 resolve한다 — 호출자가 그 뒤에도
// 한 번은 재시도해볼 수 있게 하기 위함이지, 이 함수가 "성공/실패"를 판정하진 않는다.
//
// 반드시 reload를 트리거하기 "전에" 호출해서 리스너를 먼저 붙여야 한다 (new Promise의
// executor는 동기 실행되므로 이 함수가 반환되는 시점엔 이미 리스너가 등록돼 있다).
// reload 이후에 호출하면 그 사이 'complete'가 먼저 지나가버려 영영 못 잡는 race가 생긴다.
export function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve();
    }

    function listener(updatedTabId: number, changeInfo: chrome.tabs.OnUpdatedInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        finish();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
    const timer = setTimeout(finish, timeoutMs);
  });
}
