'use client';

import { auth } from '../firebase/client';

export async function userAuthedFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function userAuthedJson(url, options = {}) {
  const res = await userAuthedFetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
