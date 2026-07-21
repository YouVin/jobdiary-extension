import type { Platform } from '@/types/application'

export const PLATFORM_LABEL: Record<Platform, string> = {
  saramin: '사람인',
  wanted: '원티드',
  jobkorea: '잡코리아',
}

// bg/text 각각 colors.platform.<site>.{bg,text} 토큰과 매칭된다 (tailwind.config.ts).
const PLATFORM_BADGE_CLASS: Record<Platform, string> = {
  saramin: 'bg-platform-saramin-bg text-platform-saramin-text',
  wanted: 'bg-platform-wanted-bg text-platform-wanted-text',
  jobkorea: 'bg-platform-jobkorea-bg text-platform-jobkorea-text',
}

interface PlatformBadgeProps {
  // 사이트 감지는 다음 단계(E-4/E-5)에서 연결한다. 지금은 항상 undefined로 렌더된다.
  platform?: Platform
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (!platform) {
    return (
      <p className="text-sm text-text-secondary">
        지원현황 페이지에서 수집할 수 있어요
      </p>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE_CLASS[platform]}`}
    >
      {PLATFORM_LABEL[platform]}
    </span>
  )
}
