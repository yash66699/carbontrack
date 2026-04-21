import { apiCall } from './client';
import { updateSavedUser } from './auth';

export async function updateProfile(name) {
  const data = await apiCall('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  updateSavedUser({ name: data.user.name });
  return data.user;
}

export async function changePassword(currentPassword, newPassword) {
  return apiCall('/api/users/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}