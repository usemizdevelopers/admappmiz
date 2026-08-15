import { useEffect, useState } from 'react';
import { getSignedUrl, type PrivateBucket } from './privateStorage';

export function useSignedUrl(bucket: PrivateBucket, path: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    getSignedUrl(bucket, path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [bucket, path]);

  return url;
}
