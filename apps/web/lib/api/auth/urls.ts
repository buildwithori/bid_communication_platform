export function getGoogleAuthUrl(mode: 'login' | 'signup') {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
  return `${baseUrl}/auth/google/start?mode=${mode}`;
}
