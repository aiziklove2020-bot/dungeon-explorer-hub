import { useState, useEffect } from 'react';
import EditableLabel from './EditableLabel';
import InstallAppButton from './InstallAppButton';
import { getDeployStatus } from '../firebase/settings';
import './Footer.css';

const Footer = ({ navigate, isChatRoute = false }) => {
  const [deployStatus, setDeployStatus] = useState(null);

  useEffect(() => {
    getDeployStatus().then(setDeployStatus).catch(() => setDeployStatus(null));
  }, []);

  const formatDate = (d) => {
    if (!d || !(d instanceof Date)) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <footer className={`footer${isChatRoute ? ' footer--chat-mobile-slim' : ''}`}>
      <div className="footer-container">
        <div className="footer-logo logo-font">
          <span className="footer-logo-red">מדברים</span> <span className="footer-logo-white">בדסמ</span>
        </div>
        <div className="footer-subtitle">Talking BDSM</div>
        <p className="footer-copyright"><EditableLabel translationKey="footer.copyright" fallback="© Created by AppEk" /></p>
        {deployStatus?.lastSuccessAt && (
          <p className="footer-build-status">
            Build: passed{formatDate(deployStatus.lastSuccessAt) ? ` · ${formatDate(deployStatus.lastSuccessAt)}` : ''}
          </p>
        )}
        <InstallAppButton />
        <div className="footer-links">
           {['home', 'about', 'contact', 'privacy', 'deleteAccount'].map(p => (
             <button key={p} type="button" onClick={() => navigate(p)} className="footer-link"><EditableLabel translationKey={`nav.${p}`} /></button>
           ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

