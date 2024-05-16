export const isBrowser = () => typeof document !== 'undefined';

const localStorageWriteTests = {
  tested: false,
  writable: false,
};

/**
 * Checks whether localStorage is supported on this browser.
 */
export const supportsLocalStorage = () => {
  if (!isBrowser()) {
    return false;
  }

  try {
    if (typeof globalThis.localStorage !== 'object') {
      return false;
    }
  } catch (e) {
    // DOM exception when accessing `localStorage`
    return false;
  }

  if (localStorageWriteTests.tested) {
    return localStorageWriteTests.writable;
  }

  const randomKey = `lswt-${Math.random()}${Math.random()}`;

  try {
    globalThis.localStorage.setItem(randomKey, randomKey);
    globalThis.localStorage.removeItem(randomKey);

    localStorageWriteTests.tested = true;
    localStorageWriteTests.writable = true;
  } catch (e) {
    // localStorage can't be written to
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document

    localStorageWriteTests.tested = true;
    localStorageWriteTests.writable = false;
  }

  return localStorageWriteTests.writable;
};
