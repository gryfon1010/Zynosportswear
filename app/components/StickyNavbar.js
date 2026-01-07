'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './StickyNavbar.module.css';

export default function StickyNavbar({ children }) {
  const [hidden, setHidden] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setHidden(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setHidden(false);
      }, 180);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`${styles.sticky} ${hidden ? styles.hidden : styles.shown}`}>
      {children}
    </div>
  );
}
