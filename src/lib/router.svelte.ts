export type Route = 'home' | 'check' | 'science' | 'sources'

function pathToRoute(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/check') return 'check'
  if (p === '/science') return 'science'
  if (p === '/sources') return 'sources'
  return 'home'
}

function routeToPath(route: Route): string {
  switch (route) {
    case 'check':
      return '/check'
    case 'science':
      return '/science'
    case 'sources':
      return '/sources'
    default:
      return '/'
  }
}

export const router = $state({
  route:
    typeof window !== 'undefined'
      ? pathToRoute(window.location.pathname)
      : ('home' as Route),
})

export function navigate(next: Route, replace = false): void {
  const path = routeToPath(next)
  if (replace) history.replaceState({}, '', path)
  else history.pushState({}, '', path)
  router.route = next
  window.scrollTo(0, 0)
}

export function syncFromLocation(): void {
  router.route = pathToRoute(window.location.pathname)
}

export function linkClick(e: MouseEvent, next: Route): void {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  ) {
    return
  }
  e.preventDefault()
  navigate(next)
}

export function hrefFor(next: Route): string {
  return routeToPath(next)
}
