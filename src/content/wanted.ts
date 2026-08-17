console.log('[JobDiary] 원티드 파서 로드됨');
import { WANTED_SELECTORS } from './selectors/wanted';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';
import { waitForElement } from './waitForElement';

// "2026. 7. 11" (마침표+공백 구분, 월/일 한 자리 가능) → "2026.07.11" (사람인/잡코리아 포맷과 통일)
// 형식이 예상과 다르면 원문을 그대로 반환, 값이 없으면 빈 문자열 반환
function normalizeAppliedAt(raw: string | undefined): string {
  if (!raw) return '';

  const match = raw.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/);
  if (!match) return raw;

  const [, year, month, day] = match;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
}

export function parseWanted(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(WANTED_SELECTORS.container);
  const results: ScrapedApplication[] = [];

  rows.forEach((row) => {
    const company = row.querySelector(WANTED_SELECTORS.company)?.textContent?.trim() ?? '';
    const position = row.querySelector(WANTED_SELECTORS.position)?.textContent?.trim() ?? '';
    const appliedAtRaw = row.querySelector(WANTED_SELECTORS.appliedAt)?.textContent?.trim();
    const status = row.querySelector(WANTED_SELECTORS.status)?.textContent?.trim() ?? '';

    results.push({
      company,
      position,
      platform: 'wanted',
      appliedAt: normalizeAppliedAt(appliedAtRaw),
      status,
      externalId: undefined, // 원티드는 지원건 고유 ID가 없음
      viewed: undefined, // 원티드 DOM에 열람 정보 없음
      appliedAtExact: undefined, // 날짜만 제공되고 시각이 없어 exact로 쓸 게 없음
      url: undefined, // 행에 공고 링크 없음
    });
  });

  return results;
}

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[원티드 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

chrome.runtime.onMessage.addListener((message: CollectMessage, _sender, sendResponse) => {
  if (message.type !== COLLECT_MESSAGE_TYPE) return;

  // React SPA라 페이지 로드 직후엔 목록이 아직 안 그려졌을 수 있다. 컨테이너가 나타날 때까지
  // 짧게 폴링한 뒤 파싱한다. 타임아웃까지 안 나타나도 에러 처리하지 않는다 — parseWanted()가
  // 그 시점 DOM을 그대로 다시 읽으므로, 타임아웃 전에 나타나면 파싱되고 끝까지 안 나타나면
  // "진짜 0건"으로 빈 배열이 반환된다(상태별 URL이라 실제로 0건일 수 있음).
  waitForElement(WANTED_SELECTORS.container).then(() => {
    const scraped = parseWanted();
    logParsedApplications(scraped);

    const applications = scraped.map(convertToApplication);
    const response: CollectResponse = { applications, count: applications.length };
    sendResponse(response);
  });

  return true; // 비동기 응답이므로 메시지 채널을 열어둔다 (MV3 규약)
});
