// 파서 단계에서 이미 "YYYY.MM.DD" 또는 "YYYY.MM.DD HH:mm" 형태로 정규화돼 넘어온다
// (사람인/잡코리아는 시분 포함, 원티드는 날짜만). 연·월·일만 취하고 시분은 버려
// 자정 기준 UTC ISO 문자열로 만든다. docs/INTEGRATION.md 날짜 변환 규칙.
const DATE_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})(?:\s+\d{2}:\d{2})?$/;

// Date.UTC는 범위를 벗어난 필드를 조용히 다음 달로 이월시키므로(예: 2월 31일 → 3월 3일),
// 자릿수만 검사하는 정규식으로는 "2026.02.31" 같은 무효한 날짜를 걸러내지 못한다. 구성한
// 날짜를 원본 입력값과 왕복 비교해 이월이 발생했으면(=원래 값이 무효였으면) false를 반환한다.
function isValidCalendarDate(y: number, mo: number, d: number): boolean {
  const roundTrip = new Date(Date.UTC(y, mo - 1, d));
  return roundTrip.getUTCFullYear() === y
    && roundTrip.getUTCMonth() === mo - 1
    && roundTrip.getUTCDate() === d;
}

export function normalizeDate(raw: string): string {
  const match = raw.match(DATE_PATTERN);
  if (!match) return ''; // 형식이 예상과 다르면 빈 문자열 (파싱 실패를 조용히 삼키지 않고 명확히 드러냄)

  const [, year, month, day] = match;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return ''; // 실존하지 않는 날짜(2월 31일 등)도 빈 문자열로 거부

  return `${year}-${month}-${day}T00:00:00.000Z`;
}

// appliedAtExact 전용: "YYYY.MM.DD HH:mm" 또는 "YYYY.MM.DD HH:mm:ss" → 시각 포함 ISO.
// appliedAt(날짜만, wall-clock에 Z를 붙이는 단순화)과 달리 여기는 실제 시각을 담으므로
// 그대로 Z를 붙이면 안 된다 — 사이트가 주는 시각은 KST(UTC+9) wall-clock인데 그걸 UTC라고
// 잘못 표기하면 실제보다 9시간 어긋난 시각(자정 근처는 날짜까지 밀림)으로 읽히게 된다.
// 3사이트 모두 한국 사이트이므로 KST로 가정하고 실제 UTC로 변환해 Z를 붙인다.
const EXACT_DATE_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function normalizeDateExact(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(EXACT_DATE_PATTERN);
  if (!match) return undefined;

  const [, year, month, day, hour, minute, second] = match;
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  const h = Number(hour);
  const mi = Number(minute);
  const s = Number(second ?? '0');

  // EXACT_DATE_PATTERN은 자릿수만 검사하므로 "2026.02.31 25:61" 같은 값도 매치된다.
  // Date.UTC는 범위를 벗어난 필드를 조용히 다음 달/시/분으로 이월시키므로(예: 2월 31일 → 3월 3일),
  // 구성한 날짜의 각 필드를 원본 입력값과 왕복 비교해 이월이 발생했으면(=원래 값이 무효였으면) undefined로 막는다.
  const kstAsUtcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const roundTrip = new Date(kstAsUtcMs);
  const isValid = roundTrip.getUTCFullYear() === y
    && roundTrip.getUTCMonth() === mo - 1
    && roundTrip.getUTCDate() === d
    && roundTrip.getUTCHours() === h
    && roundTrip.getUTCMinutes() === mi
    && roundTrip.getUTCSeconds() === s;
  if (!isValid) return undefined;

  return new Date(kstAsUtcMs - KST_OFFSET_MS).toISOString();
}
