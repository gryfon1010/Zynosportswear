'use client';

import styles from './StickyNavbar.module.css';

export default function StickyNavbar({ children }) {
  return (
    <>
      <div className={styles.sticky}>{children}</div>
      {/* Spacer so content starts below the fixed navbar */}
      <div style={{ height: 82 }} />
    </>
  );
}
