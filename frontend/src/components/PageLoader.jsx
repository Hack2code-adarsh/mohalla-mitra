import React, { useEffect, useState } from 'react';
import './PageLoader.css';

export default function PageLoader({ children, pageKey }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(t);
  }, [pageKey]);

  return (
    <div className={`pl-root ${loaded ? 'pl-loaded' : ''}`}>
      <div className="pl-overlay">
        <svg className="pl-loader" viewBox="0 0 100 100" overflow="visible">
          <g className="pl-core">
            <circle className="pl-path" cx="50" cy="50" r="1" fill="none" />
          </g>
          <g className="pl-spinner">
            <circle className="pl-path" cx="50" cy="50" r="20" fill="none" />
          </g>
          <g className="pl-layer-1"><circle className="pl-path" cx="50" cy="50" r="70" fill="none" /></g>
          <g className="pl-layer-2"><circle className="pl-path" cx="50" cy="50" r="120" fill="none" /></g>
          <g className="pl-layer-3"><circle className="pl-path" cx="50" cy="50" r="180" fill="none" /></g>
          <g className="pl-layer-4"><circle className="pl-path" cx="50" cy="50" r="240" fill="none" /></g>
          <g className="pl-layer-5"><circle className="pl-path" cx="50" cy="50" r="300" fill="none" /></g>
          <g className="pl-layer-6"><circle className="pl-path" cx="50" cy="50" r="380" fill="none" /></g>
          <g className="pl-layer-7"><circle className="pl-path" cx="50" cy="50" r="450" fill="none" /></g>
          <g className="pl-layer-8"><circle className="pl-path" cx="50" cy="50" r="540" fill="none" /></g>
        </svg>
      </div>
      <div className="pl-content">
        {children}
      </div>
    </div>
  );
}
