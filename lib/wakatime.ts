const WAKATIME_API_BASE = 'https://wakatime.com/api/v1'

export interface WakaTimeStats {
  data: {
    total_seconds: number
    daily_average: number
    languages: Array<{
      name: string
      total_seconds: number
    }>
    projects: Array<{
      name: string
      total_seconds: number
    }>
  }
}

export interface WakaTimeAllTime {
  data: {
    total_seconds: number
  }
}

export interface WakaTimeUser {
  data: {
    id: string
    username?: string
    display_name: string
    photo: string
    email: string
  }
}

export interface WakaTimeTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface WakaTimeDailySummary {
  data: Array<{
    date: string
    grand_total: {
      total_seconds: number
    }
  }>
}

/**
 * Fetches the user's WakaTime stats for the last 7 days
 */
export async function getWakaTimeStats(accessToken: string): Promise<WakaTimeStats> {
  const response = await fetch(`${WAKATIME_API_BASE}/users/current/stats/last_7_days`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`WakaTime API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches the user's WakaTime stats for the last 30 days (for accurate month calculation)
 */
export async function getWakaTimeMonthStats(accessToken: string): Promise<WakaTimeStats> {
  const response = await fetch(`${WAKATIME_API_BASE}/users/current/stats/last_30_days`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`WakaTime API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches the user's all-time coding statistics
 */
export async function getWakaTimeAllTime(accessToken: string): Promise<WakaTimeAllTime> {
  const response = await fetch(`${WAKATIME_API_BASE}/users/current/all_time_since_today`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`WakaTime API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches daily summaries for the last 7 days
 */
export async function getWakaTimeDailySummaries(accessToken: string): Promise<WakaTimeDailySummary> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  
  const response = await fetch(
    `${WAKATIME_API_BASE}/users/current/summaries?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`WakaTime API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Exchanges a refresh token for a new access token
 */
export async function refreshWakaTimeToken(refreshToken: string): Promise<WakaTimeTokenResponse> {
  const clientId = process.env.WAKATIME_CLIENT_ID!
  const clientSecret = process.env.WAKATIME_CLIENT_SECRET!

  const response = await fetch('https://wakatime.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`WakaTime token refresh error: ${response.statusText}`)
  }

  // WakaTime returns form-encoded data, not JSON
  const text = await response.text()
  const params = new URLSearchParams(text)
  const accessToken = params.get('access_token')
  const newRefreshToken = params.get('refresh_token')
  const expiresIn = params.get('expires_in')

  if (!accessToken || !newRefreshToken) {
    throw new Error('WakaTime token refresh error: Missing tokens in response')
  }

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    expires_in: expiresIn ? parseInt(expiresIn, 10) : 3600,
  }
}

/**
 * Fetches the current user's WakaTime profile
 */
export async function getWakaTimeUser(accessToken: string): Promise<WakaTimeUser> {
  const response = await fetch(`${WAKATIME_API_BASE}/users/current`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`WakaTime API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Exchanges an authorization code for access and refresh tokens
 */
export async function exchangeWakaTimeCode(code: string): Promise<WakaTimeTokenResponse> {
  const clientId = process.env.WAKATIME_CLIENT_ID!
  const clientSecret = process.env.WAKATIME_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/wakatime/callback`

  const response = await fetch('https://wakatime.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WakaTime token exchange error: ${response.statusText} - ${errorText}`)
  }

  // WakaTime returns form-encoded data, not JSON
  const text = await response.text()
  const params = new URLSearchParams(text)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const expiresIn = params.get('expires_in')

  if (!accessToken || !refreshToken) {
    throw new Error('WakaTime token exchange error: Missing tokens in response')
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn ? parseInt(expiresIn, 10) : 3600,
  }
}
