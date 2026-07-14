import { getTelHref } from '../utils/phoneLink';

/**
 * Renders a phone number as a click-to-dial link when valid, otherwise plain text.
 * Exclude from registration form inputs - use only for displayed phone numbers.
 */
const PhoneLink = ({ phone, className = '', children }) => {
  const display = children != null ? children : (phone || '-');
  const href = getTelHref(phone);
  if (href && phone && String(phone).trim() !== '-') {
    return (
      <a href={href} className={`underline underline-offset-2 ${className}`}>
        {display}
      </a>
    );
  }
  return <span className={className}>{display}</span>;
};

export default PhoneLink;
export { getTelHref };
