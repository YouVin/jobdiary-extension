// 파서 단계에서 이미 "YYYY.MM.DD" 또는 "YYYY.MM.DD HH:mm" 형태로 정규화돼 넘어온다
// (사람인/잡코리아는 시분 포함, 원티드는 날짜만). 연·월·일만 취하고 시분은 버려
// 자정 기준 UTC ISO 문자열로 만든다. docs/INTEGRATION.md 날짜 변환 규칙.
const DATE_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})(?:\s+\d{2}:\d{2})?$/;

export function normalizeDate(raw: string): string {
  const match = raw.match(DATE_PATTERN);
  if (!match) return ''; // 형식이 예상과 다르면 빈 문자열 (파싱 실패를 조용히 삼키지 않고 명확히 드러냄)

  const [, year, month, day] = match;
  return `${year}-${month}-${day}T00:00:00.000Z`;
}
