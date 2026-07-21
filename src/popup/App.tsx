import type { Platform } from '@/types/application'
import { useEffect, useState } from 'react'
import { isConnectionError, waitForTabComplete } from '@/lib/collectRecovery'
import { copyRichText } from '@/lib/clipboard'
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '@/lib/messages'
import { detectPlatform } from '@/lib/platformDetect'
import { clearAll, getAllApplications, getSiteCounts, saveSiteApplications } from '@/lib/storage'
import { applicationsToHtml, applicationsToTsv } from '@/lib/tsv'
import { Button } from './components/Button'
import { PLATFORM_LABEL, PlatformBadge } from './components/PlatformBadge'

const UNSUPPORTED_SITE_MESSAGE = '이 페이지에서는 수집할 수 없어요'
const PLATFORM_ORDER: Platform[] = ['saramin', 'jobkorea', 'wanted']
const EMPTY_COUNTS: Record<Platform, number> = { saramin: 0, jobkorea: 0, wanted: 0 }
const RECOVERY_TIMEOUT_MS = 5000
const RECOVERY_RETRY_ATTEMPTS = 3
const RECOVERY_RETRY_INTERVAL_MS = 300

function sendCollectMessage(tabId: number): Promise<CollectResponse | undefined> {
  const request: CollectMessage = { type: COLLECT_MESSAGE_TYPE }
  return chrome.tabs.sendMessage<CollectMessage, CollectResponse>(tabId, request)
}

// 새로고침 직후엔 content script가 아직 리스너를 등록 못 했을 수 있어 몇 번 짧게 재시도한다.
// "리시버 없음" 에러가 아닌 다른 에러거나 마지막 시도까지 실패하면 undefined를 반환한다(throw 안 함).
async function sendCollectMessageWithRetries(tabId: number): Promise<CollectResponse | undefined> {
  for (let attempt = 1; attempt <= RECOVERY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await sendCollectMessage(tabId)
    }
    catch (error) {
      const isLastAttempt = attempt === RECOVERY_RETRY_ATTEMPTS
      if (!isConnectionError(error) || isLastAttempt) return undefined
      await new Promise(resolve => window.setTimeout(resolve, RECOVERY_RETRY_INTERVAL_MS))
    }
  }
  return undefined
}

type CollectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', count: number }
  | { status: 'error', message: string }

type CopyState = 'idle' | 'copied' | 'error'

const COPY_BUTTON_LABEL: Record<CopyState, string> = {
  idle: '전체 복사',
  copied: '복사됐어요',
  error: '복사 실패, 다시 시도해 주세요',
}

export function App() {
  const [platform, setPlatform] = useState<Platform | undefined>(undefined)
  const [collectState, setCollectState] = useState<CollectState>({ status: 'idle' })
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [siteCounts, setSiteCounts] = useState<Record<Platform, number>>(EMPTY_COUNTS)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [recovering, setRecovering] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    getSiteCounts().then((counts) => {
      if (!cancelled) setSiteCounts(counts)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const totalCount = PLATFORM_ORDER.reduce((sum, p) => sum + siteCounts[p], 0)
  const hasAnyData = totalCount > 0

  async function refreshSiteCounts() {
    setSiteCounts(await getSiteCounts())
  }

  async function handleCollect() {
    setCopyState('idle')
    setResetConfirming(false)
    setRecovering(false)

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

      let response: CollectResponse | undefined
      try {
        response = await sendCollectMessage(tab.id)
      }
      catch (error) {
        // 진짜 미지원 페이지가 아니라(platform은 감지됨) content script가 그 탭에
        // 없는 경우(SPA 내부 라우팅으로 진입했거나 익스텐션이 리로드된 뒤 새로고침 안 한 탭).
        // 새로고침 후 재시도한다. 이 에러가 아니면 복구를 시도하지 않고 바깥 catch로 넘긴다.
        if (!isConnectionError(error)) throw error

        setRecovering(true)
        await chrome.tabs.reload(tab.id)
        await waitForTabComplete(tab.id, RECOVERY_TIMEOUT_MS)
        response = await sendCollectMessageWithRetries(tab.id)
      }

      if (!response) {
        setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
        return
      }

      await saveSiteApplications(platform, response.applications)
      await refreshSiteCounts()

      setCollectState({ status: 'success', count: response.count })
    }
    catch {
      setCollectState({ status: 'error', message: UNSUPPORTED_SITE_MESSAGE })
    }
    finally {
      setRecovering(false)
    }
  }

  async function handleCopyAll() {
    try {
      const applications = await getAllApplications()
      await copyRichText(applicationsToTsv(applications), applicationsToHtml(applications))
      setCopyState('copied')
    }
    catch {
      setCopyState('error')
    }

    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  async function handleReset() {
    if (!resetConfirming) {
      setResetConfirming(true)
      window.setTimeout(() => setResetConfirming(false), 3000)
      return
    }

    await clearAll()
    await refreshSiteCounts()
    setResetConfirming(false)
    setCopyState('idle')
    setCollectState({ status: 'idle' })
  }

  return (
    <div className="w-90 bg-page text-text-primary">
      <header className="flex items-center gap-2 border-b border-card-border bg-card px-4 py-3">
        <img src="/logo.png" alt="취준일기 로고" className="h-6 w-6 rounded" />
        <h1 className="text-base font-semibold">취준일기</h1>
      </header>

      <section className="border-b border-card-border bg-column px-4 py-3">
        <PlatformBadge platform={platform} />
      </section>

      <section className="flex flex-col gap-2 border-b border-card-border px-4 py-3">
        <Button
          variant="primary"
          onClick={handleCollect}
          disabled={collectState.status === 'loading'}
        >
          {collectState.status === 'loading' ? '수집 중...' : '지원내역 수집하기'}
        </Button>
        {collectState.status === 'success' && (
          <p className="text-sm text-text-muted">
            {collectState.count}
            건 수집됨
          </p>
        )}
        {collectState.status === 'error' && (
          <p className="text-sm text-status-rejected">{collectState.message}</p>
        )}
        {collectState.status === 'loading' && (
          <p className="text-sm text-text-muted">
            {recovering ? '페이지를 준비하는 중...' : '수집하는 중이에요…'}
          </p>
        )}
      </section>

      <section className="border-b border-card-border px-4 py-3">
        <p className="mb-2 text-sm font-medium text-text-primary">
          전체
          {' '}
          {totalCount}
          건
        </p>
        <ul className="flex flex-col gap-1">
          {PLATFORM_ORDER.map(p => (
            <li key={p} className="flex items-center justify-between text-sm text-text-secondary">
              <span>{PLATFORM_LABEL[p]}</span>
              <span>
                {siteCounts[p]}
                건
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 border-b border-card-border px-4 py-3">
        <Button variant="secondary" onClick={handleCopyAll} disabled={!hasAnyData}>
          {COPY_BUTTON_LABEL[copyState]}
        </Button>
        {hasAnyData && (
          <Button variant="secondary" onClick={handleReset} className="text-status-rejected!">
            {resetConfirming ? '정말요? 다시 누르면 전체 삭제' : '초기화'}
          </Button>
        )}
      </section>

      <section className="px-4 py-3">
        {/* "취준일기 열기" 동작 로직은 E-5에서 연결. 지금은 시각적 배치만. */}
        <Button variant="secondary">취준일기 열기</Button>
      </section>
    </div>
  )
}
