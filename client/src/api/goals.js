import { apiCall } from './client';

export async function getGoal() {
  const data = await apiCall('/api/goals');
  return data.goal;
}

export async function saveGoal(goal) {
  const data = await apiCall('/api/goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
  return data.goal;
}

export async function deleteGoal() {
  return apiCall('/api/goals', { method: 'DELETE' });
}