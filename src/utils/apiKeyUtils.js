/**
 * Returns true if the key is past its expiration date.
 * A key with no expiresAt never expires.
 */
const isExpired = (apiKey) => {
  return apiKey.expiresAt !== null && apiKey.expiresAt < new Date();
};

/**
 * Returns true if the key can be used to authenticate requests.
 * A key is unusable if it has been revoked OR if it has passed its expiration date.
 */
const isUsable = (apiKey) => {
  return apiKey.status !== 'revoked' && !isExpired(apiKey);
};

module.exports = { isExpired, isUsable };
