export function isFutureDate(value) {
  if (!value) return false;
  const now = new Date();
  const date = new Date(value);
  return date > now;
}

export function required(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}
