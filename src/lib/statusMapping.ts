import type { Status } from '@/types/application';

// docs/INTEGRATION.md의 status 매핑 규칙 그대로.
// "취소"는 부분 일치이며 "불합격"/"탈락"보다 먼저 체크한다 — 원문에 취소 표기와
// 불합격 표기가 동시에 있을 일은 없지만, 순서상 취소가 우선이다.
// screening/interview/interviewed/offer는 사이트가 원문으로 제공하지 않아 매핑 대상이 아니다.
export function mapStatus(raw: string): Status {
  if (raw.includes('취소')) return 'canceled';
  if (raw.includes('불합격') || raw.includes('탈락')) return 'rejected';
  return 'applied';
}
