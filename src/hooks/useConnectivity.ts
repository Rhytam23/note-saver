import { useEffect, useState } from 'react';
import {
  getConnectivityStatus,
  subscribeConnectivity,
  initConnectivityWatcher,
  type ConnectivityStatus,
} from '../services/connectivity';

export function useConnectivity(): ConnectivityStatus {
  const [status, setStatus] = useState<ConnectivityStatus>(getConnectivityStatus());

  useEffect(() => {
    initConnectivityWatcher();
    return subscribeConnectivity(setStatus);
  }, []);

  return status;
}
