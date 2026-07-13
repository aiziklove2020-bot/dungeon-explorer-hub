import Loader from '../Loader';

/**
 * Centered full-height loading spinner used in admin section panels.
 * Replaces repeated inline-style loading containers across admin components.
 */
const AdminLoader = ({ minHeight = '300px' }) => (
  <div className="flex items-center justify-center p-8" style={{ minHeight }}>
    <Loader size="large" />
  </div>
);

export default AdminLoader;
