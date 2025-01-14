import Openfort from '@openfort/openfort-js';

export const openfortInstance = new Openfort({
    baseConfiguration: {
        publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
    },
    shieldConfiguration: {
        shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
    },
});
