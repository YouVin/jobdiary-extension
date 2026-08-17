import type { Status } from '@/types/application';

// docs/INTEGRATION.md의 status 매핑 규칙 그대로.
// .includes 부분 일치는 더 구체적인 문자열을 먼저 검사해야 오분류를 막는다.
// - "취소"는 "불합격"/"탈락"보다 먼저 체크한다 — 원문에 취소 표기와 불합격 표기가
//   동시에 있을 일은 없지만, 순서상 취소가 우선이다.
// - "최종합격"은 "서류합격"/"서류통과"보다 먼저 체크한다.
// - "면접완료"는 "면접"을 포함하므로 "면접"보다 먼저 체크한다.
export function mapStatus(raw: string): Status {
  if (raw.includes('취소')) return 'canceled';
  if (raw.includes('불합격') || raw.includes('탈락')) return 'rejected';
  if (raw.includes('최종합격')) return 'offer';
  if (raw.includes('서류합격') || raw.includes('서류통과')) return 'screening';
  if (raw.includes('면접완료')) return 'interviewed';
  if (raw.includes('면접')) return 'interview';
  return 'applied';
}
