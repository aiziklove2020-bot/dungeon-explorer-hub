import { Link, useLocation } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { EyeOff, Trash2, LayoutDashboard, Pencil } from 'lucide-react';
import { logWarn } from '../utils/logger';
import './EditModeBanner.css';

/**
 * Edit-mode toolbar: when admin is editing, show full bar; when viewing as visitors (still logged in), show "חזרה לעריכה".
 */
const EditModeBanner = () => {
  const { isEditMode, isViewingAsVisitor, clearContentCache, clearAllContentCache } = useContent();
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin' || location.pathname === '/admin-login';

  if (!isEditMode() || isAdminPage) return null;

  const viewingAsVisitor = isViewingAsVisitor();

  const handleClearCache = () => {
    try {
      clearAllContentCache?.();
    } catch (err) {
      logWarn('EditModeBanner.clearAllContentCache', err);
    }
    window.location.reload();
  };

  const handleViewAsVisitors = () => {
    try {
      sessionStorage.setItem('viewAsVisitor', 'true');
      clearContentCache?.();
    } catch (err) {
      logWarn('EditModeBanner.viewAsVisitors', err);
    }
    window.location.reload();
  };

  const handleBackToEdit = () => {
    try {
      sessionStorage.removeItem('viewAsVisitor');
      clearAllContentCache?.();
    } catch (err) {
      logWarn('EditModeBanner.backToEdit', err);
    }
    window.location.reload();
  };

  if (viewingAsVisitor) {
    return (
      <div className="admin-toolbar admin-toolbar-compact">
        <div className="admin-toolbar-content">
          <span className="admin-badge">תצוגת מבקרים — תוכן מ-Git</span>
          <button
            type="button"
            className="admin-btn exit-btn"
            onClick={handleBackToEdit}
            title="חזרה למצב עריכה (תוכן ממסד הנתונים)"
          >
            <Pencil size={14} /> חזרה לעריכה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-content">
        <span className="admin-badge">מצב עריכה — תוכן ממסד הנתונים</span>
        <div className="admin-buttons">
          <Link to="/admin" className="admin-btn dashboard-btn" title="חזרה ללוח הבקרה">
            <LayoutDashboard size={16} /> לוח בקרה
          </Link>
          <button
            type="button"
            className="admin-btn clear-cache-btn"
            onClick={handleClearCache}
            title="נקה מטמון וטען מחדש"
          >
            <Trash2 size={14} /> נקה מטמון
          </button>
          <button
            type="button"
            className="admin-btn exit-btn"
            onClick={handleViewAsVisitors}
            title="צפה באתר כפי שהמבקרים רואים (תוכן מ-Git)"
          >
            <EyeOff size={14} /> צפה כפי שהמבקרים רואים
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModeBanner;
