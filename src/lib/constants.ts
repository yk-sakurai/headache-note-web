/**
 * Firebase Hostingで使用するセッションCookieの名前
 * 
 * @see https://firebase.google.com/docs/hosting/manage-cache#using_cookies
 */
export const SESSION_COOKIE_NAME = "__session" as const;

/**
 * セッションCookieの有効期限（ミリ秒）
 */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
