interface WaitForElementOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

// selector에 매칭되는 요소가 나타날 때까지 짧은 간격으로 폴링한다.
// 이미 있으면 즉시 resolve (지연 없음). 타임아웃 안에 못 찾으면 null로 resolve한다 —
// 이건 에러가 아니라 "여기까지 기다려도 없었다"는 신호이며, 호출자가 "진짜 없음"으로
// 처리할지는 호출자 몫이다(reject하지 않는다).
export function waitForElement(
  selector: string,
  { intervalMs = 200, timeoutMs = 4000 }: WaitForElementOptions = {},
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearInterval(timer);
        resolve(found);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}
