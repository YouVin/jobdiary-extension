console.log('[JobDiary] 사람인 파서 로드됨');
import { SARAMIN_SELECTORS } from './selectors/saramin';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';
import { toSafeUrl } from '../lib/url';

// .txt_sub는 지원완료 행에선 "미열람"/"열람"이지만 지원취소완료 행에선 취소일시가 들어온다.
// 열람/미열람으로 "시작"할 때만 viewed로 쓰고, 아니면(취소일시 등) undefined로 둔다.
// "미열람"이 "열람"을 포함하므로 반드시 미열람을 먼저 검사한다.
function parseViewed(subStatusText: string | undefined): boolean | undefined {
  if (!subStatusText) return undefined;
  if (subStatusText.startsWith('미열람')) return false;
  if (subStatusText.startsWith('열람')) return true;
  return undefined;
}

export function parseSaramin(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(SARAMIN_SELECTORS.container);

  return Array.from(rows).map((row) => {
    const company = row.dataset[SARAMIN_SELECTORS.companyAttr] ?? '';
    // 점핏(Jumpit) 연동 공고는 rec_division이 빈 문자열로 온다 — 이때만 recruittitle로 폴백.
    // rec_division이 정상 값이면(대부분의 행) 그대로 쓰고 폴백을 타지 않는다.
    const position = row.dataset[SARAMIN_SELECTORS.positionAttr]
      || row.dataset[SARAMIN_SELECTORS.positionFallbackAttr]
      || '';
    // 이미 시각까지 포함된 텍스트("2026.05.28 17:57")라 appliedAt/appliedAtExact 둘 다에 쓴다.
    const appliedAt = row.querySelector(SARAMIN_SELECTORS.appliedAt)?.textContent?.trim() ?? '';
    const status = row.querySelector(SARAMIN_SELECTORS.status)?.textContent?.trim() ?? '';
    const externalId = row.dataset[SARAMIN_SELECTORS.externalIdAttr];
    const subStatusText = row.querySelector(SARAMIN_SELECTORS.subStatus)?.textContent?.trim();
    const href = row.querySelector<HTMLAnchorElement>(SARAMIN_SELECTORS.url)?.getAttribute('href');

    return {
      company,
      position,
      platform: 'saramin',
      appliedAt,
      status,
      externalId,
      viewed: parseViewed(subStatusText),
      appliedAtExact: appliedAt || undefined,
      url: toSafeUrl(href, location.origin),
    };
  });
}

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[사람인 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

chrome.runtime.onMessage.addListener((message: CollectMessage, _sender, sendResponse) => {
  if (message.type !== COLLECT_MESSAGE_TYPE) return;

  const scraped = parseSaramin();
  logParsedApplications(scraped);

  const applications = scraped.map(convertToApplication);
  const response: CollectResponse = { applications, count: applications.length };
  sendResponse(response);
});
