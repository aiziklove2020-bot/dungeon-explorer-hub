import { useSearchParams } from 'react-router-dom';
import RegistrationForm from '../components/RegistrationForm';
import SEO from '../components/SEO';
import './Register.css';

const Register = ({ navigate }) => {
  const [searchParams] = useSearchParams();
  const clickedDay = searchParams.get('day');
  const partyId = searchParams.get('partyId');

  return (
    <div className="register-container">
      <SEO
        title="הרשמה לאירוע | מדברים BDSM"
        description="הרשמה למסיבות ואירועי מדברים BDSM. Party registration - Talking BDSM events."
        canonicalPath="/register"
      />
      <RegistrationForm onCancel={() => navigate('home')} clickedDay={clickedDay} partyId={partyId} />
    </div>
  );
};

export default Register;

