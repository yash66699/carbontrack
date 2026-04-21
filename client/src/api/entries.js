import { apiCall } from './client';

export async function getEntries() {
  const data = await apiCall('/api/entries');
  return data.entries;
}

export async function createEntry(entry) {
  const data = await apiCall('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  return data.entry;
}

export async function deleteEntry(id) {
  return apiCall(`/api/entries/${id}`, { method: 'DELETE' });
}