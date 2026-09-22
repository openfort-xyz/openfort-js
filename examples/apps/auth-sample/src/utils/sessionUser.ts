import type { NextApiRequest } from 'next'
import openfort from './openfortAdminConfig'

const customAuthDomain = process.env.NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN

/**
 * Resolves the signed-in user of an API request, or undefined when there is none.
 *
 * Cookie-session projects (NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN): the browser attaches the
 * HttpOnly session cookie to this same-site request, and we validate it by forwarding
 * the Cookie header to get-session on the delegated host. Bearer projects send the
 * access token in the Authorization header.
 */
export async function getSessionUserId(req: NextApiRequest): Promise<string | undefined> {
  if (customAuthDomain) {
    if (!req.headers.cookie) return undefined
    const response = await fetch(`https://${customAuthDomain}/api/iam/v2/auth/get-session`, {
      headers: {
        cookie: req.headers.cookie,
        'x-project-key': process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY!,
      },
    })
    if (!response.ok) return undefined
    const session = (await response.json()) as { user?: { id?: string } } | null
    return session?.user?.id
  }

  const accessToken = req.headers.authorization?.split(' ')[1]
  if (!accessToken) return undefined
  const session = await openfort.iam.getSession({ accessToken })
  return session?.user.id
}
