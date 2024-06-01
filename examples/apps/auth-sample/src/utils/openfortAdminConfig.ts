import Openfort from '@openfort/openfort-node';

// Ensure Openfort is only initialized once
const openfort = (() => {
  if (!process.env.NEXTAUTH_OPENFORT_SECRET_KEY) {
    throw new Error("Openfort secret key is not set");
  }
  return new Openfort(process.env.NEXTAUTH_OPENFORT_SECRET_KEY);
})();

export default openfort;
