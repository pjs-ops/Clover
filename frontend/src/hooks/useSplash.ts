import { useEffect, useState } from 'react';

export function useSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 600);
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  return { visible, fading };
}
