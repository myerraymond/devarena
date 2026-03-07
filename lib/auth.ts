import { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { createServerClient } from '@/lib/supabase'

// Minimum GitHub account age in days
const MIN_ACCOUNT_AGE_DAYS = 7

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'github' && account.access_token) {
        try {
          // ── Fetch GitHub profile ────────────────────────
          const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'User-Agent': 'DevArena',
            },
          })

          if (!githubUserResponse.ok) {
            console.error('GitHub API error during sign in:', githubUserResponse.status)
            return '/?' + new URLSearchParams({ error: 'github_api_error' })
          }

          const githubUser = await githubUserResponse.json()

          if (!githubUser?.login) {
            console.error('GitHub sign in: missing login field')
            return '/?' + new URLSearchParams({ error: 'invalid_github_profile' })
          }

          // ── Account age check ─────────────────────────
          if (githubUser.created_at) {
            const accountAge = Date.now() - new Date(githubUser.created_at).getTime()
            const accountAgeDays = accountAge / (1000 * 60 * 60 * 24)
            if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
              console.warn(`Blocked new GitHub account: ${githubUser.login} (${Math.floor(accountAgeDays)} days old)`)
              return '/?' + new URLSearchParams({ error: 'account_too_new' })
            }
          }

          // ── Public repos check ────────────────────────
          if (!githubUser.public_repos || githubUser.public_repos < 1) {
            console.warn(`Blocked GitHub account with no repos: ${githubUser.login}`)
            return '/?' + new URLSearchParams({ error: 'no_repos' })
          }

          // ── Turnstile verification (if configured) ────
          // The turnstile token is passed via the signIn options
          // and is available in the request. For server-side NextAuth
          // callbacks, turnstile is verified in the client before
          // initiating the sign-in flow.

          // ── Upsert user into Supabase ─────────────────
          const supabase = createServerClient()

          const { data: dbUser, error } = await supabase
            .from('users')
            .upsert(
              {
                github_username: githubUser.login,
                github_access_token: account.access_token,
                username: githubUser.login,
                display_name: githubUser.name || githubUser.login,
                avatar_url: githubUser.avatar_url,
                is_public: true,
              },
              {
                onConflict: 'github_username',
              }
            )
            .select()
            .single()

          if (error || !dbUser) {
            console.error('Error upserting GitHub user:', error)
            return '/?' + new URLSearchParams({ error: 'database_error' })
          }

          // Trigger async GitHub stats sync (fire-and-forget)
          const syncUrl = `${process.env.NEXTAUTH_URL}/api/github/sync`
          fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.NEXTAUTH_SECRET || '',
            },
            body: JSON.stringify({ userId: dbUser.id }),
          }).catch((syncError) => {
            console.error('Error syncing GitHub stats:', syncError)
          })

          return true
        } catch (error) {
          console.error('GitHub signin error:', error)
          return '/?' + new URLSearchParams({ error: 'signin_failed' })
        }
      }
      return true
    },
    async jwt({ token, account, user, profile }) {
      if (account?.provider === 'github' && account.access_token) {
        token.accessToken = account.access_token

        try {
          const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'User-Agent': 'DevArena',
            },
          })
          const githubUser = await githubUserResponse.json()

          const githubUsername = githubUser.login
          if (githubUsername) {
            token.githubUsername = githubUsername
            token.githubImage = githubUser.avatar_url

            const supabase = createServerClient()
            const { data: dbUser } = await supabase
              .from('users')
              .select('id')
              .eq('github_username', githubUsername)
              .single()
            if (dbUser) {
              token.userId = dbUser.id
            }
          }
        } catch (error) {
          console.error('Error fetching GitHub user in JWT:', error)
          const githubUsername =
            (profile as any)?.login ||
            (user as any)?.login ||
            (user as any)?.name
          if (githubUsername) {
            token.githubUsername = githubUsername
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.accessToken) {
        ;(session as any).accessToken = token.accessToken as string
      }
      if (token.userId) {
        ;(session as any).userId = token.userId as string
      }
      if (token.githubUsername) {
        if (session.user) {
          ;(session.user as any).login = token.githubUsername as string
          if (!session.user.name) {
            session.user.name = token.githubUsername as string
          }
        }
      }
      if (token.githubImage && session.user) {
        session.user.image = token.githubImage as string
      } else if (!session.user?.image && token.githubUsername && session.user) {
        const supabase = createServerClient()
        const { data: user } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('github_username', token.githubUsername)
          .single()
        if (user?.avatar_url) {
          session.user.image = user.avatar_url
        }
      }

      return session
    },
    async redirect() {
      return `${process.env.NEXTAUTH_URL}/dashboard`
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
}
