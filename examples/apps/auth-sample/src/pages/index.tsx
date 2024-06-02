import React, {useMemo} from 'react';
import {NextPage} from 'next';
import LoginSignupForm from '../components/Authentication/LoginSignupForm';
import MintNFTButton from '../components/NFT/MintNFTButton';
import {useOpenfort} from '../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import AccountRecovery from '../components/Authentication/AccountRecovery';
import Spinner from '../components/Shared/Spinner';
import NFTDisplay from '../components/NFT/NFTDisplay';
import LogoutButton from '../components/Shared/LogoutButton';
import SignMessageButton from '../components/Signatures/SignMessageButton';
import SignTypedDataButton from '../components/Signatures/SignTypedDataButton';
import EvmProviderButton from '../components/EvmProvider/EvmProviderButton';

import {useAuth} from '../contexts/AuthContext';
const nftImageBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADtUlEQVR4Xu3dsXEVQRBF0fkGseDgiAAUAK5CUCryiUAh4CoM4eBQhIIBm8Ohqqv5V35Xz7y++7pndkv/9vXXw58Dfx+fnyD6nJ+v3yhe81PyK3h6/Zr/FgCGgBZAAdb8AWD1zwGmCdb8WP8A0AKohWn+AGgIJAamAdb8zQBU/k4BRy1YCdb8WP9mAC1AAMzeo9QC0AKmAdb8ARAAXQULA/oETrfQHECq37uA0ylg+GWWOlAOkAM0AwgD+gSunwFEvH8RqwLqGhQAza/x3AJ0ARofAKZgAJh+fBWM6Tk8AFDCWgAKqOG1AFMwBzD9agGoH4fnACZhDmD65QCoH4fnACZhDmD65QCoH4fnACZhDmD65QCoH4fnACZhDmD65QCoH4fnACZhDmD67XeAt8cX+v8A+jLk08MbleDH9y8Ur8HT61cHvAWAIRAA+FHktIBW/nOm158D1AKI4VoAyZcD8BQ8baFY/1pAp4DZU0wzQDMAmVgzAMnXDNAMMHyRVQuoBZCH1QJIvlpALaAWYP/suXsAe5nVDNAMQE2sGYDkawbgGUAtDOs3Hq43qarfuAPoBsYriAsIAPzFEdR/PDwAAoAgVAetBZD8HpwD5ABEUQ5A8s0H5wA5AFGYA5B888E5QA5AFOYAJN98cA6QAxCFOQDJNx+cA+QARGEOQPLNB+cAOQBROO4AtPqCxxXgl0HjO2gBpEAAkHz7gwNgfw1pBwFA8u0PDoD9NaQdBADJtz84APbXkHYQACTf/uAA2F9D2kEAkHz7gwNgfw1pBwFA8u0PDoD9NaQdBADJtz84APbXkHbAPxihHyTQ6q9g/aJG82/ffwAgAQEw/ElXDmD/pCsHyAEe6DeDtlsg1v9s338OgAQEQDMAImThOgPlAKZ/LWC7BWL9AyAAnpQhiq8F4O8WkvpX8PYHoBkACQiATgGIkIXXAmoBRFAtgORrBlg/BGH91++fPwj58P5MGv7+/Erxmp+SX8HT69f8AYAEaAEUYM0fAAHwQq+DpwnW/Fj/WoAWQC1M8wfAYw4gEEwDrPmbAaT6nQLOUQtWgjU/1r8ZQAsQALP3KLUAtIBpgDV/AARApwBhQJ/A6RaaA0j1OwV0CsgBehtIHlIL6HUwAaQOxDMArf4Knn4C7n39AYAEbAc4AALA7gFQv1oAzkCqfw6ACtYC7lzAAAgAUkCPcZT8Cq4FoII5wJ0LGAABQArUAobfJVD1/oObzGYAJKAWcOcCBkAAkALNAM0ABJAGNwOggttbwF+kxELNGVJ15QAAAABJRU5ErkJggg==';

const HomePage: NextPage = () => {
  const {user} = useAuth();
  const {embeddedState} = useOpenfort();

  const linkedAccount = useMemo(() => {
    // Find in linkedAccounts with provider email
    const linkedAccount = user?.linkedAccounts?.find(
      (account: any) => account.provider === 'email'
    );
    return linkedAccount;
  }, [user]);

  if (
    [EmbeddedState.UNAUTHENTICATED, EmbeddedState.NONE].includes(
      embeddedState
    ) ||
    linkedAccount?.verified === false
  )
    return <LoginSignupForm verifyEmail={linkedAccount?.verified === false} />;

  if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <div>
        <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
        <div className="absolute top-2 right-2">
          <LogoutButton />
        </div>
        <div className="mt-8">
          <AccountRecovery />
        </div>
      </div>
    );
  }

  if (embeddedState !== EmbeddedState.READY) {
    return (
      <div className="absolute top-1/2 left-1/2 flex items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
      <div className="absolute top-2 right-2">
        <LogoutButton />
      </div>
      <div className="mt-8">
        <h1 className="flex justify-left font-medium text-xl">Mint NFT</h1>
        <NFTDisplay imageUrl={nftImageBase64} alt="NFT Image" />
        <MintNFTButton />
      </div>
      <div className="mt-8 py-4 space-y-4 border-t">
        <h1 className="flex justify-left font-medium text-xl">Signatures</h1>
        <p className="flex justify-center text-gray-600">
          <span className="font-medium text-black">Message: </span>Hello World!
        </p>
        <SignMessageButton />
        <div className="flex text-left items-left pt-6">
          <span className="font-medium text-black">Typed message: </span>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/openfort-xyz/sample-browser-nextjs-embedded-signer/blob/main/src/components/Signatures/SignTypedDataButton.tsx#L25"
            className="flex justify-center text-blue-600 hover:underline"
          >
            {'View the typed message here.'}
          </a>
        </div>
        <SignTypedDataButton />
        <EvmProviderButton />
      </div>
    </div>
  );
};

export default HomePage;
