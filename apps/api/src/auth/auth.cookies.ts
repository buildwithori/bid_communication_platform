const SESSION_COOKIE_NAME = 'bid_session';
const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type CookieRequest = {
  headers: {
    cookie?: string;
  };
};

type CookieResponse = {
  cookie: (name: string, value: string, options: CookieOptions) => void;
  clearCookie: (name: string, options: CookieOptions) => void;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
};

export function setSessionCookie(response: CookieResponse, token: string) {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookie(response: CookieResponse) {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function readSessionCookie(request: CookieRequest) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE_NAME)
    ?.slice(1)
    .join('=');
}

const GOOGLE_OAUTH_COOKIE_NAME = 'bid_google_oauth';
const GOOGLE_OAUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 10;

export function setGoogleOAuthCookie(response: CookieResponse, state: string, mode: 'login' | 'signup') {
  response.cookie(GOOGLE_OAUTH_COOKIE_NAME, `${state}.${mode}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_MS,
  });
}

export function readGoogleOAuthCookie(request: CookieRequest) {
  const value = readCookie(request, GOOGLE_OAUTH_COOKIE_NAME);
  if (!value) return undefined;
  const separator = value.lastIndexOf('.');
  if (separator < 1) return undefined;
  const mode = value.slice(separator + 1);
  if (mode !== 'login' && mode !== 'signup') return undefined;
  return { state: value.slice(0, separator), mode } as const;
}

export function clearGoogleOAuthCookie(response: CookieResponse) {
  response.clearCookie(GOOGLE_OAUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
  });
}

function readCookie(request: CookieRequest, cookieName: string) {
  return request.headers.cookie
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === cookieName)
    ?.slice(1)
    .join('=');
}
