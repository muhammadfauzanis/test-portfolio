import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

// <img> with a shimmering skeleton until it loads, plus an optional mobile source.
export default function SmartImage({ className = '', src, mobileSrc, onLoad, onError, loading = 'lazy', ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const isMobile = useIsMobile();

  return (
    <img
      {...rest}
      src={isMobile && mobileSrc ? mobileSrc : src}
      loading={loading}
      decoding="async"
      className={`skeleton-image${loaded ? '' : ' is-loading'}${className ? ` ${className}` : ''}`}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setLoaded(true);
        onError?.(e);
      }}
    />
  );
}
