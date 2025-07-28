import Openfort from '@openfort/openfort-node';

const openfort = (() => {
  if (!process.env.NEXTAUTH_OPENFORT_SECRET_KEY) {
    throw new Error("Openfort secret key is not set");
  }
  return new Openfort(process.env.NEXTAUTH_OPENFORT_SECRET_KEY, process.env.NEXT_PUBLIC_BACKEND_URL);
})();

export default openfort;
