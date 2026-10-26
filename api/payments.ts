import apiClient from './client';

export interface Payment {
  id: string;
  appointment_id: string;
  kind: 'deposit' | 'full';
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  provider: 'console' | 'stripe';
  amount: string | number;
  currency: string;
  checkout_url?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface BusinessSubscription {
  id: string;
  plan: 'free' | 'starter' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  current_period_end?: string | null;
  created_at: string;
  updated_at: string;
}

export const payAppointmentDeposit = async (
  appointmentId: string
): Promise<Payment> => {
  const response = await apiClient.post<any>(
    `/payments/appointments/${appointmentId}/pay/`,
    {}
  );
  return (response.data?.data || response.data) as Payment;
};

export const getMySubscription = async (): Promise<BusinessSubscription> => {
  const response = await apiClient.get<any>('/payments/subscription/');
  return (response.data?.data || response.data) as BusinessSubscription;
};
