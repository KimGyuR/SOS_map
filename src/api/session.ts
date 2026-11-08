// Holds the JWT in memory only (team decision): restarting the app requires logging in again.
let accessToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Subscribe to forced logouts (401). Returns an unsubscribe function. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

// Shared rule: on 401 the app drops the token and returns to the login screen.
export function handleUnauthorized() {
  accessToken = null;
  unauthorizedListeners.forEach((listener) => listener());
}
