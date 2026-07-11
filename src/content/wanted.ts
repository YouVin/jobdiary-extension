console.log('[JobDiary] 원티드 파서 로드됨');
import { WANTED_SELECTORS } from './selectors/wanted';
import type { ScrapedApplication } from '../types/application';

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
    });
  });

  return results;
}

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[원티드 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

logParsedApplications(parseWanted());
