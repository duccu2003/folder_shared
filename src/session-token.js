import { createCsrfToken } from './security.js';

export function rotateCsrfToken(session) {
  const token = createCsrfToken();
  session.csrfToken = token;
  return token;
}
