const mockAlertUpdate = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      alert: {
        update: (...args: any[]) => mockAlertUpdate(...args),
      },
    })),
  };
});

jest.mock('axios');
jest.mock('nodemailer');

import { sendNotificationWithRetry } from '../services/notificationService';

describe('Notification Retry Logic - sendNotificationWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true and update alert status to DELIVERED on first success', async () => {
    const mockSendFn = jest.fn().mockResolvedValue(undefined);
    mockAlertUpdate.mockResolvedValue({ id: 'alert-1', deliveryStatus: 'DELIVERED' });

    const result = await sendNotificationWithRetry('alert-1', mockSendFn, 3, 10);

    expect(result).toBe(true);
    expect(mockSendFn).toHaveBeenCalledTimes(1);
    expect(mockAlertUpdate).toHaveBeenCalledTimes(1);
    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: {
        deliveryStatus: 'DELIVERED',
        isTriggered: true,
      },
    });
  });

  it('should retry and succeed if initial attempts fail', async () => {
    const mockSendFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network glitch'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(undefined);

    mockAlertUpdate.mockResolvedValue({ id: 'alert-2', deliveryStatus: 'DELIVERED' });

    const result = await sendNotificationWithRetry('alert-2', mockSendFn, 3, 10);

    expect(result).toBe(true);
    expect(mockSendFn).toHaveBeenCalledTimes(3);
    expect(mockAlertUpdate).toHaveBeenCalledTimes(1);
    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: 'alert-2' },
      data: {
        deliveryStatus: 'DELIVERED',
        isTriggered: true,
      },
    });
  });

  it('should exhaust all retries and set status to FAILED when all attempts throw errors', async () => {
    const mockSendFn = jest.fn().mockRejectedValue(new Error('Connection refused'));
    mockAlertUpdate.mockResolvedValue({ id: 'alert-3', deliveryStatus: 'FAILED' });

    const result = await sendNotificationWithRetry('alert-3', mockSendFn, 3, 10);

    expect(result).toBe(false);
    expect(mockSendFn).toHaveBeenCalledTimes(3);
    expect(mockAlertUpdate).toHaveBeenCalledTimes(1);
    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: 'alert-3' },
      data: {
        deliveryStatus: 'FAILED',
        isTriggered: true,
      },
    });
  });
});
