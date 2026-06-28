import './Loader.css';

const Loader = ({ size = 'large' }) => {
  
  const text = 'BDSM';
  const letterColors = [
    { letter: 'B', color: '#dc2626' }, 
    { letter: 'D', color: '#ffffff' }, 
    { letter: 'S', color: '#dc2626' }, 
    { letter: 'M', color: '#ffffff' }  
  ];

  const sizeClasses = {
    small: 'loader-small',
    medium: 'loader-medium',
    large: 'loader-large'
  };

  return (
    <div className={`loader-container ${sizeClasses[size]}`}>
      <div className="loader-text" dir="ltr">
        {text.split('').map((letter, index) => {
          const colorInfo = letterColors[index % letterColors.length];
          const letterColor = colorInfo ? colorInfo.color : '#ffffff';
          return (
            <span
              key={index}
              className="loader-letter"
              style={{
                color: letterColor,
                textShadow: letterColor === '#dc2626' 
                  ? '0 0 20px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.4)'
                  : '0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)'
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
      <div className="loader-dots">
        <span className="loader-dot"></span>
        <span className="loader-dot"></span>
        <span className="loader-dot"></span>
      </div>
    </div>
  );
};

export default Loader;

