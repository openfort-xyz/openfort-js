import { OpenfortKitButton, useStatus, OpenfortKitStatus } from '@openfort/openfort-kit'
import { useEffect } from 'react';
import { SetPage } from '../lib/openfortAuth';

export function Wallet({ setPage }: SetPage) {
  const { status } = useStatus()

  // Redirect to login if not connected to a wallet
  useEffect(() => {
    if (status === OpenfortKitStatus.DISCONNECTED) {
      setPage("login");
    }

    // Clear URL parameter after social authentication
    const url = new URL(window.location.href);
    url.searchParams.delete("authenticated");
    window.history.replaceState({}, document.title, url.toString());
  }, [status, setPage]);

  // Render OpenfortKit UI
  return (
    <div>
      <OpenfortKitButton />
    </div>
  );
}
