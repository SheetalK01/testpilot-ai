const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address';
  return undefined;
}

export function newPasswordError(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Use at least 8 characters';
  if (password.length > 72) return 'Use at most 72 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'Include at least one letter and one digit';
  return undefined;
}
