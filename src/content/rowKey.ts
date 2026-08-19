import type { ScrapedApplication } from '../types/application';

// 행 식별 키. externalId가 있으면(사람인/잡코리아 최신 지원) 그것만으로 충분히 유일하다.
// 없으면(원티드, 잡코리아 구버전 지원) 회사명+지원일만으로는 같은 회사에 같은 날 지원한
// 서로 다른 두 건을 하나로 뭉개버릴 위험이 있어, 구분 가능한 필드를 최대한 모아 쓴다.
// join 대신 JSON.stringify(배열)로 직렬화하는 이유는 값 안에 구분자로 쓰일 문자(|, 콤마 등)가
// 섞여 있어도 서로 다른 두 행이 같은 문자열로 충돌하지 않게 하기 위함.
export function buildRowKey(row: ScrapedApplication | undefined): string | undefined {
  if (!row) return undefined;
  if (row.externalId) return `id:${row.externalId}`;
  return JSON.stringify([row.company, row.position, row.status, row.appliedAt, row.appliedAtExact, row.url]);
}
