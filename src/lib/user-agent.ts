export function detectOsFromUserAgent(userAgent: string | null): string {
  const ua = userAgent?.toLowerCase() ?? "";

  if (!ua) {
    return "unknown";
  }

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iOS";
  }

  if (ua.includes("android")) {
    return "Android";
  }

  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macOS";
  }

  if (ua.includes("windows")) {
    return "Windows";
  }

  if (ua.includes("linux")) {
    return "Linux";
  }

  return "unknown";
}
