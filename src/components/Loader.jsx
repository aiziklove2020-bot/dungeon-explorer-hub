import './Loader.css';

const LOGO_SRC = '/assets/design/couples-logo-128.png';

const SIZES = {
  small: 'loader-small',
  medium: 'loader-medium',
  large: 'loader-large',
};

const Loader = ({ size = 'large' }) => (
  <div className={`loader-container ${SIZES[size] || SIZES.large}`} role="status" aria-label="טוען">
    <img className="loader-logo" src={LOGO_SRC} alt="" width="128" height="128" decoding="async" />
    <div className="loader-dots" aria-hidden="true">
      <span className="loader-dot"></span>
      <span className="loader-dot"></span>
      <span className="loader-dot"></span>
    </div>
  </div>
);

export default Loader;
