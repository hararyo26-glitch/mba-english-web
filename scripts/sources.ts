export interface FeedSource {
  id: string
  label: 'BBC News' | 'BBC 6 Minute English' | 'FT News Briefing' | 'TED Talks'
  feedUrl: string
}

/**
 * 個人学習利用OKな公式RSSフィードのみを対象とする(要件定義書 3節)。
 * URLは2026年8月時点でWeb検索により確認済み。
 */
export const FEED_SOURCES: FeedSource[] = [
  {
    id: 'bbc-global-news',
    label: 'BBC News',
    feedUrl: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss',
  },
  {
    id: 'bbc-6min-english',
    label: 'BBC 6 Minute English',
    feedUrl: 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss',
  },
  {
    id: 'ft-news-briefing',
    label: 'FT News Briefing',
    feedUrl: 'https://feeds.acast.com/public/shows/73fe3ede-5c5c-4850-96a8-30db8dbae8bf',
  },
  {
    id: 'ted-talks-daily',
    label: 'TED Talks',
    feedUrl: 'https://feeds.acast.com/public/shows/67587e77c705e441797aff96',
  },
]
