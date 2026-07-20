import { Button } from './components/Button'
import { PlatformBadge } from './components/PlatformBadge'

export default function App() {
  return (
    <div className="w-[360px] bg-page text-text-primary">
      <header className="flex items-center gap-2 border-b border-card-border bg-card px-4 py-3">
        <img src="/logo.png" alt="취준일기 로고" className="h-6 w-6 rounded" />
        <h1 className="text-base font-semibold">취준일기</h1>
      </header>

      <section className="border-b border-card-border bg-column px-4 py-3">
        {/* 실제 사이트 감지는 다음 단계에서 연결. 감지되면 platform 배지가 표시된다. */}
        <PlatformBadge />
      </section>

      <section className="flex flex-col gap-2 border-b border-card-border px-4 py-3">
        {/* 동작 로직은 다음 단계(E-4/E-5)에서 연결. 지금은 시각적 배치만. */}
        <Button variant="primary">지원내역 수집하기</Button>
        <Button variant="secondary">취준일기 열기</Button>
      </section>

      <section className="px-4 py-3">
        {/* 수집 결과("N건 수집됨")는 다음 단계에서 여기 표시된다. */}
        <p className="text-sm text-text-muted">아직 수집한 내역이 없어요</p>
      </section>
    </div>
  )
}
