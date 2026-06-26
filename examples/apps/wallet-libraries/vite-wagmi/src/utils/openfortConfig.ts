import { Openfort } from '@openfort/openfort-js'

const openfortInstance = new Openfort({
  baseConfiguration: {
    publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY,
  },
  shieldConfiguration: {
    shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY,
  },
})

export default openfortInstance
