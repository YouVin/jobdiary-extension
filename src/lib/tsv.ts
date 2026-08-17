import type { Application, Status } from '@/types/application';
import { toSafeUrl } from './url';

// docs/INTEGRATION.md status 매핑의 역방향(표시용). 지금 collect 흐름에서 mapStatus가
// 실제로 만드는 값은 applied/rejected/canceled뿐이지만, Application.status 타입 전체를
// 다루므로 나머지 값도 라벨을 채워 Record 전체를 만족시킨다(향후 웹앱 쪽 확장 대비).
const STATUS_LABEL: Record<Status, string> = {
  applied: '지원완료',
  screening: '서류전형',
  interview: '면접',
  interviewed: '면접완료',
  offer: '최종합격',
  rejected: '불합격',
  canceled: '지원취소',
};

const TSV_HEADER = ['회사', '포지션', '상태', '지원일', '플랫폼', '열람'];

// 탭/개행이 셀 안에 섞이면 TSV 구조가 깨지므로 공백으로 치환한다.
function sanitizeCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim();
}

// viewed: true→"열람", false→"미열람", undefined(정보 없음)→"".
function viewedLabel(viewed: boolean | undefined): string {
  if (viewed === true) return '열람';
  if (viewed === false) return '미열람';
  return '';
}

function toRow(app: Omit<Application, 'id' | 'updatedAt'>): string[] {
  return [
    sanitizeCell(app.company),
    sanitizeCell(app.position),
    STATUS_LABEL[app.status],
    app.appliedAt.slice(0, 10), // "2026-06-09T00:00:00.000Z" → "2026-06-09"
    app.platform,
    viewedLabel(app.viewed),
  ];
}

export function applicationsToTsv(
  applications: Array<Omit<Application, 'id' | 'updatedAt'>>,
): string {
  const rows = applications.map(toRow);
  return [TSV_HEADER, ...rows].map(row => row.join('\t')).join('\n');
}

// HTML이므로 &보다 먼저 <, >를 이스케이프하면 &amp;가 다시 걸려 이중 이스케이프되므로 &를 가장 먼저 처리한다.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 회사 셀(0번 인덱스)에 해당하는 열 위치. url이 있으면 이 셀만 <a href>로 감싼다.
const COMPANY_CELL_INDEX = 0;

// 노션/워드 등 리치 텍스트 붙여넣기가 표로 인식하도록 하는 HTML 표.
// 값은 TSV와 같은 sanitizeCell(탭/개행 제거)을 거친 뒤 escapeHtml로 XSS/마크업 깨짐을 막는다.
export function applicationsToHtml(
  applications: Array<Omit<Application, 'id' | 'updatedAt'>>,
): string {
  const headCells = TSV_HEADER.map(label => `<th>${escapeHtml(label)}</th>`).join('');
  const bodyRows = applications
    .map((app) => {
      // 파서 단계에서 이미 http(s)만 통과시키지만, HTML로 실행 가능한 href를 만드는 지점이라
      // javascript:/data: 등 위험한 스킴이 어떤 경로로든 섞여 들어오지 않도록 여기서도 재검증한다.
      const safeUrl = toSafeUrl(app.url);
      const cells = toRow(app)
        .map((cell, index) => {
          const escaped = escapeHtml(cell);
          if (index === COMPANY_CELL_INDEX && safeUrl) {
            return `<td><a href="${escapeHtml(safeUrl)}">${escaped}</a></td>`;
          }
          return `<td>${escaped}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}
