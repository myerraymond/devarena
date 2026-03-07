/**
 * Server-side Turnstile token verification.
 * Used to verify that a human completed the challenge before sign-in.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If Turnstile is not configured, skip verification (dev mode)
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    console.warn('TURNSTILE_SECRET_KEY not configured')
    return false
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      }
    )

    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}
