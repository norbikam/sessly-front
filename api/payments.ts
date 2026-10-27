import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { WEB_BASE_URL } from '../constants/config';
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

/** @deprecated org-level scaffold */
export interface BusinessSubscription {
  id: string;
  plan: 'free' | 'starter' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  current_period_end?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSubscription {
  id: string;
  business_id: string;
  business_name: string;
  business_city?: string;
  organization_id?: string | null;
  plan: 'standard' | 'complimentary';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  monthly_price_amount: string | number;
  currency: string;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  admin_note?: string;
  cancelled_at?: string | null;
  access_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCatalog {
  monthly_price_amount: string;
  currency: string;
  trial_days: number;
  customer_deposits_enabled: boolean;
  billing_note: string;
  revenuecat_product_id?: string;
  revenuecat_entitlement_id?: string;
}

function paymentReturnUrls() {
  if (Platform.OS === 'web') {
    const base = WEB_BASE_URL.replace(/\/+$/, '');
    return {
      success_url: `${base}/appointments?payment=success`,
      cancel_url: `${base}/appointments?payment=cancel`,
    };
  }
  return {
    success_url: Linking.createURL('appointments', {
      queryParams: { payment: 'success' },
    }),
    cancel_url: Linking.createURL('appointments', {
      queryParams: { payment: 'cancel' },
    }),
  };
}

export const payAppointmentDeposit = async (
  appointmentId: string
): Promise<Payment> => {
  const response = await apiClient.post<any>(
    `/payments/appointments/${appointmentId}/pay/`,
    paymentReturnUrls()
  );
  return (response.data?.data || response.data) as Payment;
};

export const getMySubscription = async (): Promise<BusinessSubscription> => {
  const response = await apiClient.get<any>('/payments/subscription/');
  return (response.data?.data || response.data) as BusinessSubscription;
};

export const getMyLocationSubscriptions = async (): Promise<LocationSubscription[]> => {
  const response = await apiClient.get<any>('/payments/location-subscriptions/');
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data : [];
};

export const getSubscriptionCatalog = async (): Promise<SubscriptionCatalog> => {
  const response = await apiClient.get<any>('/payments/location-subscriptions/catalog/');
  return (response.data?.data || response.data) as SubscriptionCatalog;
};
