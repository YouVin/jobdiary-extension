console.log('[JobDiary] 사람인 파서 로드됨');
import { SARAMIN_SELECTORS } from './selectors/saramin';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';

export function parseSaramin(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(SARAMIN_SELECTORS.container);

  return Array.from(rows).map((row) => {
    const company = row.dataset[SARAMIN_SELECTORS.companyAttr] ?? '';
    // 점핏(Jumpit) 연동 공고는 rec_division이 빈 문자열로 온다 — 이때만 recruittitle로 폴백.
    // rec_division이 정상 값이면(대부분의 행) 그대로 쓰고 폴백을 타지 않는다.
    const position = row.dataset[SARAMIN_SELECTORS.positionAttr]
      || row.dataset[SARAMIN_SELECTORS.positionFallbackAttr]
      || '';
    const appliedAt = row.querySelector(SARAMIN_SELECTORS.appliedAt)?.textContent?.trim() ?? '';
    const status = row.querySelector(SARAMIN_SELECTORS.status)?.textContent?.trim() ?? '';
    const externalId = row.dataset[SARAMIN_SELECTORS.externalIdAttr];

    return {
      company,
      position,
      platform: 'saramin',
      appliedAt,
      status,
      externalId,
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
