import type { Platform, ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';
import { saveSiteApplications } from '../lib/storage';

// 팝업은 포커스를 잃으면 자동으로 닫혀 응답을 못 받을 수 있다(특히 원티드처럼 여러 페이지를
// 순회하는 데 시간이 걸리는 경우). 그래서 저장은 content script가 여기서 직접 끝내고,
// 팝업은 나중에 storage를 다시 읽기만 하면 되게 한다 — 팝업 생존 여부와 무관하게 데이터가 남는다.
//
// isCollecting 플래그는 같은 탭에 두 번째 COLLECT 요청이 들어왔을 때(재수집 진행 중 재클릭 등)
// 새로 시작하지 않고 즉시 busy로 응답한다. 원티드는 실제 "다음 페이지" 버튼을 클릭해 순회하므로
// 두 순회가 동시에 페이지 상태를 조작하면 결과가 섞일 수 있어 특히 중요하고, 사람인/잡코리아도
// 불필요하게 사이트에 중복 요청을 보내지 않기 위해 동일하게 막는다.
interface CollectResult {
  rows: ScrapedApplication[];
  truncated: boolean;
}

export function registerCollectHandler(
  platform: Platform,
  collect: () => Promise<CollectResult>,
): void {
  let isCollecting = false;

  function respond(sendResponse: (response: CollectResponse) => void, response: CollectResponse): void {
    try {
      sendResponse(response);
    }
    catch {
      // 팝업이 이미 닫혀 응답 채널이 끊긴 경우 — 저장은 이미 끝났거나 진행 중이므로 무해하다.
    }
  }

  chrome.runtime.onMessage.addListener((message: CollectMessage, _sender, sendResponse) => {
    if (message.type !== COLLECT_MESSAGE_TYPE) return;

    if (isCollecting) {
      respond(sendResponse, { applications: [], count: 0, busy: true });
      return;
    }

    isCollecting = true;
    collect()
      .then(async ({ rows: scraped, truncated }) => {
        console.log(`[${platform}] ${scraped.length}건 파싱됨`);
        console.table(scraped);

        const applications = scraped.map(convertToApplication);
        await saveSiteApplications(platform, applications);
        respond(sendResponse, { applications, count: applications.length, truncated });
      })
      .catch((error: unknown) => {
        console.error(`[${platform}] 수집 실패`, error);
        respond(sendResponse, { applications: [], count: 0, error: true });
      })
      .finally(() => {
        isCollecting = false;
      });

    return true; // 비동기 응답이므로 메시지 채널을 열어둔다 (MV3 규약)
  });
}
