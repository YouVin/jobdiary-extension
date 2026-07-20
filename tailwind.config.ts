import type { Config } from 'tailwindcss'

// 웹앱(jobdiary)과 동일한 디자인 토큰. status/platform 색은 여기 한 곳에서만 정의한다.
// 스캔 대상 파일 범위는 v4 방식대로 src/popup/index.css의 @source 지시자가 담당한다
// (JS config의 content 배열은 @tailwindcss/vite + @config 조합에서 스캔에 영향을 주지 않음).
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          tint: '#EEF2FF',
          text: '#3730A3',
        },
        status: {
          applied: '#A1A1AA',
          screening: '#378ADD',
          interview: '#7F77DD',
          interviewed: '#7F77DD',
          offer: '#639922',
          rejected: '#E24B4A',
          canceled: '#D4D4D8',
        },
        platform: {
          saramin: { bg: '#F4F4F5', text: '#3F3F46' },
          wanted: { bg: '#EEF2FF', text: '#3730A3' },
          jobkorea: { bg: '#FEF2F2', text: '#991B1B' },
        },
        text: {
          primary: '#18181B',
          secondary: '#52525B',
          muted: '#A1A1AA',
        },
        page: '#FAFAFA',
        column: '#F2F2F4',
        card: '#FFFFFF',
        'card-border': '#DEDEE2',
        'border-strong': '#A1A1AA',
      },
    },
  },
} satisfies Config
