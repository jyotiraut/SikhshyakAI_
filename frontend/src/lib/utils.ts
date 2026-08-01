import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a JWT token is expired
 * @param token - JWT token string
 * @returns true if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token has expiration and if it's expired (exp is in seconds, Date.now() is in ms)
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    // If we can't parse the token, consider it expired/invalid
    return true;
  }
}

/**
 * Gets the current auth token from localStorage and validates it
 * @returns token if valid, null if expired or not found
 */
export function getValidToken(): string | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  if (isTokenExpired(token)) {
    // Clear expired token
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('role');
    localStorage.removeItem('schoolId');
    return null;
  }

  return token;
}
