export interface ApiRuntime {
  getAccessToken(): string | null | Promise<string | null>
  handleUnauthorized(): void | Promise<void>
}

const browserRuntime: ApiRuntime = {
  getAccessToken() {
    return typeof window === 'undefined' ? null : window.localStorage.getItem('token')
  },
  handleUnauthorized() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('user')
    window.localStorage.removeItem('active_tahfiz_id')
    window.localStorage.removeItem('active_tahfiz_name')
    window.localStorage.removeItem('support_tahfiz_id')
    window.localStorage.removeItem('support_tahfiz_name')
    window.location.assign('/login')
  },
}

let runtime: ApiRuntime = browserRuntime

/**
 * Replaces browser-only authentication behavior for another platform.
 * A React Native client can provide SecureStore-backed token access and
 * native navigation without changing the API methods themselves.
 */
export function configureApiRuntime(nextRuntime: ApiRuntime) {
  runtime = nextRuntime
}

export function getApiRuntime() {
  return runtime
}
