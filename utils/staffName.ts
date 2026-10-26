import { Appointment, BusinessStaff } from '../types/api';

export function staffDisplayName(staff?: BusinessStaff | string | null): string | null {
  if (!staff || typeof staff === 'string') return null;
  const full = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  return full || staff.username || null;
}

export function appointmentClientName(item: Appointment): string {
  if (item.customer_first_name) {
    return `${item.customer_first_name} ${item.customer_last_name || ''}`.trim();
  }
  return item.guest_name || item.customer_email || 'Klient';
}
