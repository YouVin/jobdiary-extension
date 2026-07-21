import type { Application, Platform } from '@/types/application';

// docs/PLANNING.md "데이터 정합성 / 저장 전략" 계약대로: 사이트별 슬롯을 chrome.storage.local의
// 단일 키에 저장한다. 재수집 시 해당 슬롯만 통째로 덮어쓴다(사이트 단위 스냅샷, 병합 아님).
// 중복 판별 로직은 여기 두지 않는다 — 익스텐션은 판별하지 않고, 웹앱의 addApplicationsFromExtension이 전담한다.
export const STORAGE_KEY = 'jobdiary:collected';

const PLATFORMS: Platform[] = ['saramin', 'jobkorea', 'wanted'];

type CollectedApplication = Omit<Application, 'id' | 'updatedAt'>;
type Slots = Record<Platform, CollectedApplication[]>;

async function readSlots(): Promise<Slots> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<Slots> | undefined;

  return {
    saramin: stored?.saramin ?? [],
    jobkorea: stored?.jobkorea ?? [],
    wanted: stored?.wanted ?? [],
  };
}

// 해당 platform 슬롯만 최신 결과로 덮어쓴다. 다른 사이트 슬롯은 그대로 유지된다.
export async function saveSiteApplications(
  platform: Platform,
  applications: CollectedApplication[],
): Promise<void> {
  const slots = await readSlots();
  slots[platform] = applications;
  await chrome.storage.local.set({ [STORAGE_KEY]: slots });
}

// 세 슬롯을 합쳐 하나의 배열로 반환한다 (전체 복사/표시용).
export async function getAllApplications(): Promise<CollectedApplication[]> {
  const slots = await readSlots();
  return PLATFORMS.flatMap(platform => slots[platform]);
}

// 사이트별 건수 (팝업 현황 표시용).
export async function getSiteCounts(): Promise<Record<Platform, number>> {
  const slots = await readSlots();
  return {
    saramin: slots.saramin.length,
    jobkorea: slots.jobkorea.length,
    wanted: slots.wanted.length,
  };
}

// 전체 초기화 (모든 슬롯 비움). "초기화" 버튼용.
export async function clearAll(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
