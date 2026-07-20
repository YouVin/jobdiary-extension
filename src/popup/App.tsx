import type { Platform } from '@/types/application'
import { useEffect, useState } from 'react'
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '@/lib/messages'
import { detectPlatform } from '@/lib/platformDetect'
import { Button } from './components/Button'
import { PlatformBadge } from './components/PlatformBadge'

const UNSUPPORTED_SITE_MESSAGE = '이 페이지에서는 수집할 수 없어요'

type CollectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', count: number }
  | { status: 'error', message: string }

export default function App() {
  const [platform, setPlatform] = useState<Platform | undefined>(undefined)
  const [collectState, setCollectState] = useState<CollectState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (cancelled) return
      setPlatform(detectPlatform(tab?.url))
    }).catch(() => {
      if (!cancelled) setPlatform(undefined)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCollect() {
    if (!platform) {
      setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
      return
    }

    setCollectState({ status: 'loading' })

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
        return
      }

      const request: CollectMessage = { type: COLLECT_MESSAGE_TYPE }
      const response = await chrome.tabs.sendMessage<CollectMessage, CollectResponse>(tab.id, request)

      if (!response) {
        setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
        return
      }

      setCollectState({ status: 'success', count: response.count })
    }
    catch {
      setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
    }
  }

  return (
    <div className="w-[360px] bg-page text-text-primary">
      <header className="flex items-center gap-2 border-b border-card-border bg-card px-4 py-3">
        <img src="/logo.png" alt="취준일기 로고" className="h-6 w-6 rounded" />
        <h1 className="text-base font-semibold">취준일기</h1>
      </header>

      <section className="border-b border-card-border bg-column px-4 py-3">
        <PlatformBadge platform={platform} />
      </section>

      <section className="flex flex-col gap-2 border-b border-card-border px-4 py-3">
        {/* "취준일기 열기" 동작 로직은 E-5에서 연결. 지금은 시각적 배치만. */}
        <Button
          variant="primary"
          onClick={handleCollect}
          disabled={collectState.status === 'loading'}
        >
          {collectState.status === 'loading' ? '수집 중...' : '지원내역 수집하기'}
        </Button>
        <Button variant="secondary">취준일기 열기</Button>
      </section>

      <section className="px-4 py-3">
        {collectState.status === 'success' && (
          <p className="text-sm text-text-primary">
            {collectState.count}
            건 수집됨
          </p>
        )}
        {collectState.status === 'error' && (
          <p className="text-sm text-status-rejected">{collectState.message}</p>
        )}
        {collectState.status === 'loading' && (
          <p className="text-sm text-text-muted">수집하는 중이에요…</p>
        )}
        {collectState.status === 'idle' && (
          <p className="text-sm text-text-muted">아직 수집한 내역이 없어요</p>
        )}
      </section>
    </div>
  )
}
