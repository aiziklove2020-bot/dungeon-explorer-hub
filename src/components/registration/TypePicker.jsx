import { User, Users, Sparkles, Percent } from 'lucide-react';

const ICON_MAP = {
  single_male: User,
  single_female: Sparkles,
  female_discount: Percent,
  couple: Users,
};

export default function TypePicker({ registration, onSelect, onCancel, t }) {
  const types = registration?.types || [];
  return (
    <div className="registration-step1-container">
      <h2 className="registration-step1-question">
        {registration?.question || t('registration.howToRegister')}
      </h2>
      {types.map((option) => {
        const Icon = ICON_MAP[option.id] || User;
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className="registration-type-button"
          >
            <div className="registration-type-icon-container">
              <Icon className="registration-type-icon" size={22} />
            </div>
            <div className="registration-type-content">
              <div className="registration-type-title">{option.title}</div>
              <div className="registration-type-subtitle">{option.sub}</div>
            </div>
          </button>
        );
      })}
      <button onClick={onCancel} className="registration-cancel-btn">
        {registration?.cancelText || t('registration.cancel')}
      </button>
    </div>
  );
}
