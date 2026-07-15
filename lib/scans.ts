import { createClient } from '@/lib/supabase/server'

export type RankSnapshot = {
  keyword: string
  rank: number | null
  scan_week: string
}

export type OrganicSnapshot = {
  keyword: string
  rank: number | null
  url: string | null
  scan_week: string
}

export type AIVisibilityResult = {
  engine: string
  query: string
  mentioned: boolean
  position: number | null
  excerpt: string | null
  scan_week: string
}

export type CitationSnapshot = {
  platform: string
  category: string
  status: string
  issue: string | null
  listing_url: string | null
  scan_date: string
}

export type CompetitorSnapshot = {
  keyword: string
  position: number
  competitor_name: string
  scan_week: string
}

export type AICompetitorSnapshot = {
  engine: string
  query: string
  competitor_name: string
  position: number
  scan_week: string
}

export type StoredReview = {
  id: string
  source: string
  author: string | null
  rating: number | null
  body: string | null
  published_at: string | null
  replied: boolean
  reply_text: string | null
  url: string | null
}

export type ActionPlanAction = {
  priority: number
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

export type SavedActionPlan = {
  actions: ActionPlanAction[]
  generated_at: string
}

export type ContentSignal = {
  kind: 'website' | 'listicle' | 'reddit'
  title: string | null
  url: string | null
  mentioned: boolean | null
  detail: {
    // website audit
    reachable?: boolean
    score?: number
    checks?: Array<{ id: string; label: string; passed: boolean; fix: string }>
    // listicle / reddit
    snippet?: string | null
  } | null
  scan_date: string
}

export async function getRankSnapshots(userId: string, weeksBack = 8): Promise<RankSnapshot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rank_snapshots')
    .select('keyword, rank, scan_week')
    .eq('user_id', userId)
    .order('scan_week', { ascending: false })
    .limit(weeksBack * 12)

  return (data ?? []) as RankSnapshot[]
}

export async function getOrganicSnapshots(userId: string, weeksBack = 8): Promise<OrganicSnapshot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organic_snapshots')
    .select('keyword, rank, url, scan_week')
    .eq('user_id', userId)
    .order('scan_week', { ascending: false })
    .limit(weeksBack * 12)

  return (data ?? []) as OrganicSnapshot[]
}

export async function getLatestAIVisibility(userId: string): Promise<AIVisibilityResult[]> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('ai_visibility_results')
    .select('scan_week')
    .eq('user_id', userId)
    .order('scan_week', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data } = await supabase
    .from('ai_visibility_results')
    .select('engine, query, mentioned, position, excerpt, scan_week')
    .eq('user_id', userId)
    .eq('scan_week', latest.scan_week)

  return (data ?? []) as AIVisibilityResult[]
}

export async function getLatestCitations(userId: string): Promise<CitationSnapshot[]> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('citation_snapshots')
    .select('scan_date')
    .eq('user_id', userId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data } = await supabase
    .from('citation_snapshots')
    .select('platform, category, status, issue, listing_url, scan_date')
    .eq('user_id', userId)
    .eq('scan_date', latest.scan_date)

  return (data ?? []) as CitationSnapshot[]
}

export async function getLatestContentSignals(userId: string): Promise<ContentSignal[]> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('content_signals')
    .select('scan_date')
    .eq('user_id', userId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data } = await supabase
    .from('content_signals')
    .select('kind, title, url, mentioned, detail, scan_date')
    .eq('user_id', userId)
    .eq('scan_date', latest.scan_date)

  return (data ?? []) as ContentSignal[]
}

export async function getActionPlan(userId: string): Promise<SavedActionPlan | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('action_plans')
    .select('actions, generated_at')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as SavedActionPlan) ?? null
}

export async function getReviews(userId: string, limit = 20): Promise<StoredReview[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, source, author, rating, body, published_at, replied, reply_text, url')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as StoredReview[]
}

export async function getLatestCompetitors(userId: string): Promise<CompetitorSnapshot[]> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('competitor_snapshots')
    .select('scan_week')
    .eq('user_id', userId)
    .order('scan_week', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data } = await supabase
    .from('competitor_snapshots')
    .select('keyword, position, competitor_name, scan_week')
    .eq('user_id', userId)
    .eq('scan_week', latest.scan_week)
    .order('position', { ascending: true })

  return (data ?? []) as CompetitorSnapshot[]
}

export async function getLatestAICompetitors(userId: string): Promise<AICompetitorSnapshot[]> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('ai_competitor_snapshots')
    .select('scan_week')
    .eq('user_id', userId)
    .order('scan_week', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return []

  const { data } = await supabase
    .from('ai_competitor_snapshots')
    .select('engine, query, competitor_name, position, scan_week')
    .eq('user_id', userId)
    .eq('scan_week', latest.scan_week)
    .order('position', { ascending: true })

  return (data ?? []) as AICompetitorSnapshot[]
}

export async function updateReviewReply(
  userId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('reviews')
    .update({ replied: true, reply_text: replyText })
    .eq('id', reviewId)
    .eq('user_id', userId)
}
