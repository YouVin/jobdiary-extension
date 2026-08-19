console.log('[JobDiary] 사람인 파서 로드됨');
import { SARAMIN_SELECTORS } from './selectors/saramin';
import type { ScrapedApplication } from '../types/application';
import { toSafeUrl } from '../lib/url';
import { collectAllPages } from './paginate';
import { registerCollectHandler } from './collectHandler';

// .txt_sub는 지원완료 행에선 "미열람"/"열람"이지만 지원취소완료 행에선 취소일시가 들어온다.
// 열람/미열람으로 "시작"할 때만 viewed로 쓰고, 아니면(취소일시 등) undefined로 둔다.
// "미열람"이 "열람"을 포함하므로 반드시 미열람을 먼저 검사한다.
function parseViewed(subStatusText: string | undefined): boolean | undefined {
  if (!subStatusText) return undefined;
  if (subStatusText.startsWith('미열람')) return false;
  if (subStatusText.startsWith('열람')) return true;
  return undefined;
}

export function parseSaramin(root: ParentNode = document): ScrapedApplication[] {
  const rows = root.querySelectorAll<HTMLElement>(SARAMIN_SELECTORS.container);

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

// 행 식별 키: externalId가 있으면 그걸로, 없으면 회사+지원일 조합으로 폴백.
function saraminRowKey(row: ScrapedApplication | undefined): string | undefined {
  if (!row) return undefined;
  return row.externalId ? `id:${row.externalId}` : `${row.company}|${row.appliedAt}`;
}

function buildSaraminPageUrl(pageNum: number): string {
  const url = new URL(location.href);
  url.searchParams.set(SARAMIN_SELECTORS.pageParam, String(pageNum));
  return url.toString();
}

// page 1은 현재 문서 그대로(기존 경로 유지), 2..N은 같은 쿼리(유저 필터 그대로)로 페이지만
// 바꿔가며 fetch + DOMParser로 파싱한다. 없는 페이지를 요청하면 사람인이 1페이지로
// "클램프"되므로, 새 페이지 첫 행이 "1페이지" 첫 행과 같으면 클램프로 보고 그 페이지는
// 버리고 중단한다. ★"직전 페이지"와 비교하면 안 된다 — 클램프된 첫 페이지는 직전
// 페이지(진짜 마지막 페이지)와는 다르고 1페이지와만 같아서, 직전 페이지 비교로는 그
// 시점을 못 잡고 중복 데이터가 결과에 한 페이지만큼 섞여 들어간다(격리 테스트로 확인됨).
async function collectSaraminAllPages(): Promise<{ rows: ScrapedApplication[], truncated: boolean }> {
  const page1Rows = parseSaramin(document);
  const page1FirstKey = saraminRowKey(page1Rows[0]);

  const { rows, pageCount, truncated } = await collectAllPages({
    page1Rows,
    buildPageUrl: buildSaraminPageUrl,
    parseRows: doc => parseSaramin(doc),
    getRowKey: saraminRowKey,
    isSiteTerminal: (rows) => {
      const first = saraminRowKey(rows[0]);
      return first !== undefined && first === page1FirstKey;
    },
  });
  console.log(`[사람인 파서] 총 ${pageCount}페이지, ${rows.length}건 수집${truncated ? ' (일부 중단됨)' : ''}`);
  return { rows, truncated };
}

registerCollectHandler('saramin', collectSaraminAllPages);
