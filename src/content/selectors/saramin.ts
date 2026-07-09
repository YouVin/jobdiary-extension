export const SARAMIN_SELECTORS = {
  // 컨테이너 (지원 1건)
  container: '.row._apply_list',
  // 회사명 (row.dataset.company_nm)
  companyAttr: 'company_nm',
  // 공고명 텍스트, 카드 내부 상대 셀렉터, 예: "웹퍼블리셔 및 프론트엔드"
  position: '.division',
  // 지원일 텍스트, 예: "2026.06.09 20:27"
  appliedAt: '.col_date',
  // 상태 텍스트, 예: "지원완료"
  status: '.txt_status',
  // 세부상태 텍스트, 예: "미열람"
  subStatus: '.txt_sub',
  // 고유ID (row.dataset.recruitapply_idx), 중복 방지용
  externalIdAttr: 'recruitapply_idx',
} as const;
