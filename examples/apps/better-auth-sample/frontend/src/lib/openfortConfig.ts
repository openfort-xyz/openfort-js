import { Openfort } from '@openfort/openfort-js';
 
const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY || '',
  }
});
 
export default openfort;
