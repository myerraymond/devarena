import NextAuth, { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { createServerClient } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/session'

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
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'github' && account.access_token) {
        try {
          const supabase = createServerClient()
          
          // Fetch GitHub user data
          const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          })
          const githubUser = await githubUserResponse.json()

          // Upsert user into Supabase
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
            return false
          }

          // Sync GitHub stats immediately (async, don't wait)
          fetch(`${process.env.NEXTAUTH_URL}/api/github/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: dbUser.id }),
          }).catch((syncError) => {
            console.error('Error syncing GitHub stats:', syncError)
          })

          return true
        } catch (error) {
          console.error('GitHub signin error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, user, profile }) {
      if (account?.provider === 'github' && account.access_token) {
        token.accessToken = account.access_token
        
        // Fetch GitHub user data to get login
        try {
          const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          })
          const githubUser = await githubUserResponse.json()
          
          const githubUsername = githubUser.login
          if (githubUsername) {
            token.githubUsername = githubUsername
            token.githubImage = githubUser.avatar_url
            
            // Get user ID from Supabase using GitHub username
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
          // Fallback to profile/user data
          const githubUsername = (profile as any)?.login || (user as any)?.login || (user as any)?.name
          if (githubUsername) {
            token.githubUsername = githubUsername
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token.userId) {
        session.userId = token.userId as string
      }
      if (token.githubUsername) {
        ;(session.user as any).login = token.githubUsername as string
        ;(session.user as any).name = token.githubUsername as string
        // Ensure name is set
        if (!session.user.name) {
          session.user.name = token.githubUsername as string
        }
      }
      // Set image from token or Supabase
      if (token.githubImage) {
        session.user.image = token.githubImage as string
      } else if (!session.user?.image && token.githubUsername) {
        // Fetch from Supabase if available
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
      return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    },
  },
  pages: {
    signIn: '/',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
