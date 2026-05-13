// src/utils/validate.js
// Pure validation helpers — no side effects, easy to unit-test.
// Returns { valid: boolean, message?: string }.

/**
 * Validate an email address with a simple but robust regex.
 * @param {string} email
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email is required." };
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) {
    return { valid: false, message: "Email address is not valid." };
  }
  return { valid: true };
}

/**
 * Validate password strength.
 * Rules: min 8 chars, at least one uppercase, one lowercase, one digit.
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one digit." };
  }
  return { valid: true };
}
