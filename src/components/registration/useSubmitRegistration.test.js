import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isUserBlocked: vi.fn(async () => ({ blocked: false })),
  saveRegistration: vi.fn().mockResolvedValue(undefined),
  registerToPartyNew: vi.fn().mockResolvedValue(undefined),
  registerCoupleToParty: vi.fn().mockResolvedValue(undefined),
  getRegistrationSettings: vi.fn().mockResolvedValue({ telegramEnabled: false }),
  getPartyById: vi.fn().mockResolvedValue(null),
  sendRegistrationTelegram: vi.fn().mockResolvedValue(undefined),
  getPartyDaysFromParty: vi.fn(() => []),
  getTelegramConfigForMessage: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../firebase/users', () => ({
  isUserBlocked: mocks.isUserBlocked,
}));

vi.mock('../../firebase/parties', () => ({
  registerToPartyNew: mocks.registerToPartyNew,
  registerCoupleToParty: mocks.registerCoupleToParty,
  getPartyById: mocks.getPartyById,
  COUPLE_BOTH_REGISTERED_ERROR: 'couple-both-registered',
  COUPLE_SAME_PHONE_ERROR: 'couple-same-phone',
}));

vi.mock('../../firebase/settings', () => ({
  getRegistrationSettings: mocks.getRegistrationSettings,
}));

vi.mock('../../firebase/telegram', () => ({
  sendRegistrationTelegram: mocks.sendRegistrationTelegram,
  getPartyDaysFromParty: mocks.getPartyDaysFromParty,
  getTelegramConfigForMessage: mocks.getTelegramConfigForMessage,
  MESSAGE_KEYS: { REGISTRATION: 'registration' }
}));

const { useSubmitRegistration } = await import('./useSubmitRegistration');

const t = (key) => key;

const singleForm = () => ({
  regType: 'single_male',
  fullName: 'Alice',
  partnerName: '',
  phone: '0501234567',
  telegram: 'alice',
  maleName: '',
  femaleName: '',
  malePhone: '',
  femalePhone: '',
  maleTelegram: '',
  femaleTelegram: '',
  arrivalMethod: 'independent',
  pickupAddress: '',
  selectedParties: ['p1'],
});

const coupleForm = () => ({
  ...singleForm(),
  regType: 'couple',
  fullName: '',
  phone: '',
  telegram: '',
  maleName: 'Bob',
  femaleName: 'Ann',
  malePhone: '0502223333',
  femalePhone: '0504445555',
});

beforeEach(() => {
  for (const fn of Object.values(mocks)) {
    fn.mockClear?.();
  }
  mocks.isUserBlocked.mockResolvedValue({ blocked: false });
  mocks.saveRegistration.mockResolvedValue(undefined);
  mocks.registerToPartyNew.mockResolvedValue(undefined);
  mocks.registerCoupleToParty.mockResolvedValue(undefined);
  mocks.getRegistrationSettings.mockResolvedValue({ telegramEnabled: false });
  mocks.getTelegramConfigForMessage.mockResolvedValue(null);
  mocks.getPartyById.mockResolvedValue(null);
});

function render(activeParties = [{ id: 'p1', registrations: [] }]) {
  return renderHook(() =>
    useSubmitRegistration({ saveRegistration: mocks.saveRegistration, activeParties, t })
  );
}

describe('useSubmitRegistration', () => {
  it('single happy path: registers, saves log, returns true', async () => {
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(singleForm());
    });

    expect(ok).toBe(true);
    expect(mocks.registerToPartyNew).toHaveBeenCalledTimes(1);
    expect(mocks.registerToPartyNew).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        fullName: 'Alice',
        phoneNumber: '0501234567',
        telegramUsername: '@alice',
        registrationType: 'single-male-balance',
        gender: 'male',
        selfArrival: true,
      })
    );
    expect(mocks.saveRegistration).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.telegramError).toBe('');
  });

  it('sends Telegram when unified admin config exists even if legacy registrationSettings are empty', async () => {
    mocks.getRegistrationSettings.mockResolvedValue({});
    mocks.getPartyById.mockResolvedValue({
      id: 'p1',
      name: 'Party',
      date: new Date(),
      registrations: []
    });
    mocks.getTelegramConfigForMessage.mockResolvedValue({
      botToken: 'bot-token',
      chatIds: ['-1001234567890'],
      enabled: true,
      template: null,
      parseMode: 'HTML'
    });

    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(singleForm());
    });

    expect(ok).toBe(true);
    expect(mocks.sendRegistrationTelegram).toHaveBeenCalledTimes(1);
  });

  it('couple happy path: uses registerCoupleToParty with both sides', async () => {
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(coupleForm());
    });

    expect(ok).toBe(true);
    expect(mocks.registerCoupleToParty).toHaveBeenCalledTimes(1);
    const [partyId, male, female] = mocks.registerCoupleToParty.mock.calls[0];
    expect(partyId).toBe('p1');
    expect(male.gender).toBe('male');
    expect(male.partnerPhone).toBe('0504445555');
    expect(female.gender).toBe('female');
    expect(female.partnerPhone).toBe('0502223333');
  });

  it('blocks submission when the single user is blocked', async () => {
    mocks.isUserBlocked.mockResolvedValueOnce({ blocked: true });
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(singleForm());
    });

    expect(ok).toBe(false);
    expect(result.current.telegramError).toBe('accountBlocked');
    expect(mocks.registerToPartyNew).not.toHaveBeenCalled();
  });

  it('surfaces the already-registered pre-check for singles', async () => {
    const parties = [
      {
        id: 'p1',
        registrations: [{ phoneNumber: '0501234567', userId: 'x' }],
      },
    ];
    const { result } = render(parties);

    let ok;
    await act(async () => {
      ok = await result.current.submit(singleForm());
    });

    expect(ok).toBe(false);
    expect(result.current.telegramError).toBe('alreadyRegistered');
    expect(mocks.registerToPartyNew).not.toHaveBeenCalled();
  });

  it('blocks couple when both partners are already registered', async () => {
    const parties = [
      {
        id: 'p1',
        registrations: [
          { phoneNumber: '0502223333' },
          { phoneNumber: '0504445555' },
        ],
      },
    ];
    const { result } = render(parties);

    let ok;
    await act(async () => {
      ok = await result.current.submit(coupleForm());
    });

    expect(ok).toBe(false);
    expect(result.current.telegramError).toBe('registration.coupleBothAlreadyRegistered');
    expect(mocks.registerCoupleToParty).not.toHaveBeenCalled();
  });

  it('maps backend COUPLE_BOTH_REGISTERED_ERROR to the couple error string', async () => {
    mocks.registerCoupleToParty.mockRejectedValueOnce({ code: 'couple-both-registered' });
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(coupleForm());
    });

    expect(ok).toBe(false);
    expect(result.current.telegramError).toBe('registration.coupleBothAlreadyRegistered');
  });

  it('maps backend COUPLE_SAME_PHONE_ERROR to its error string', async () => {
    mocks.registerCoupleToParty.mockRejectedValueOnce({ code: 'couple-same-phone' });
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(coupleForm());
    });

    expect(ok).toBe(false);
    expect(result.current.telegramError).toBe('registration.coupleSamePhone');
  });

  it('never fails registration when telegram dispatch throws', async () => {
    mocks.getRegistrationSettings.mockRejectedValueOnce(new Error('telegram down'));
    const { result } = render();

    let ok;
    await act(async () => {
      ok = await result.current.submit(singleForm());
    });

    expect(ok).toBe(true);
    expect(mocks.saveRegistration).toHaveBeenCalledTimes(1);
  });
});
