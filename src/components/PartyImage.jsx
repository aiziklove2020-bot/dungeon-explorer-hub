import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function PartyImage({ src, alt, onClick, style, title }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const defaultStyle = {
    marginBottom: '15px',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'opacity 0.3s',
    position: 'relative',
    height: 'auto'
  };

  const mergedStyle = { ...defaultStyle, ...style };

  const containerHeight = mergedStyle.height === '100%' ? '100%' : 'auto';
  const minH = containerHeight === '100%' ? '100%' : '200px';

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  // When `onClick` is provided this becomes an interactive element. Use the
  // button role plus tabIndex/keyDown so screen readers announce activation.
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
        onMouseEnter: (e) => { e.currentTarget.style.opacity = '0.9'; },
        onMouseLeave: (e) => { e.currentTarget.style.opacity = '1'; },
        'aria-label': alt || title,
      }
    : {};

  return (
    <div
      style={mergedStyle}
      title={title}
      {...interactiveProps}
    >
      {error ? (
        <div
          role="img"
          aria-label={t('a11y.imageLoadFailed') || 'טעינת התמונה נכשלה'}
          style={{
            width: '100%',
            height: containerHeight,
            minHeight: minH,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(20, 20, 20, 0.8)',
            borderRadius: mergedStyle.borderRadius || '12px',
            color: '#a1a1aa'
          }}
        >
          {t('a11y.imageLoadFailed') || 'טעינת התמונה נכשלה'}
        </div>
      ) : (
        <>
          {/* Do not use display:none while loading: native lazy-loading may never start,
              so onLoad never fires (stuck spinner in admin / long pages). */}
          <img
            src={src}
            alt={alt || ''}
            loading="eager"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: containerHeight === '100%' ? '100%' : (mergedStyle.height || '200px'),
              minHeight: minH,
              objectFit: 'cover',
              borderRadius: mergedStyle.borderRadius || '12px',
              pointerEvents: 'none',
              display: 'block',
              opacity: loading ? 0 : 1,
              transition: 'opacity 0.25s ease-out'
            }}
          />
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(20, 20, 20, 0.85)',
                borderRadius: mergedStyle.borderRadius || '12px',
                pointerEvents: 'none'
              }}
              aria-hidden="true"
            >
              <div
                className="image-loader"
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                  borderTop: '4px solid #cc0000',
                  borderRadius: '50%'
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PartyImage;
