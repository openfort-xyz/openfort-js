import Openfort from '@openfort/openfort-js';
import {useEffect} from 'react';

function Authenticate({openfortInstance}: {openfortInstance: Openfort}) {
  useEffect(() => {
    openfortInstance.getUser(); // EIP-6963
  }, [openfortInstance]);
  return <div>Loading...</div>;
}

export default Authenticate;
