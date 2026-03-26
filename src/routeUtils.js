/**
 * Parse `location.hash` into path + query (hash router).
 * `#/home` → `/home` + optional query params
 */
export function getHashRoute() {
  const raw = window.location.hash || '#/home'
  const inner = raw.startsWith('#') ? raw.slice(1) : raw
  if (!inner || inner === '/') {
    return { path: '/home', searchParams: new URLSearchParams() }
  }
  const [pathPart, queryPart] = inner.split('?')
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  return { path, searchParams: new URLSearchParams(queryPart || '') }
}
