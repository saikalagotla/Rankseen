import mixpanel from 'mixpanel-browser'

let initialized = false

export function initMixpanel() {
  if (initialized || typeof window === 'undefined') return
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
    track_pageview: false,
    persistence: 'localStorage',
  })
  initialized = true
}

export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  mixpanel.track(event, props)
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return
  mixpanel.track('Page Viewed', { path })
}

export function identifyUser(id: string, props?: { email?: string; name?: string; plan?: string }) {
  if (typeof window === 'undefined') return
  mixpanel.identify(id)
  if (props) mixpanel.people.set({ $email: props.email, $name: props.name, plan: props.plan })
}

export function resetUser() {
  if (typeof window === 'undefined') return
  mixpanel.reset()
}
