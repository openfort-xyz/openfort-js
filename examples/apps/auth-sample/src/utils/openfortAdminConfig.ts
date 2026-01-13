import Openfort from '@openfort/openfort-node'

const openfort = (() => {
  if (!process.env.NEXTAUTH_OPENFORT_SECRET_KEY) {
    throw new Error('Openfort secret key is not set')
  }
  return new Openfort(process.env.NEXTAUTH_OPENFORT_SECRET_KEY, {
    basePath: process.env.NEXT_PUBLIC_BACKEND_URL,
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY,
  })
})()

export default openfort
