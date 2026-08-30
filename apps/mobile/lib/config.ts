/**
 * Empty means same-origin, which is what production uses: CloudFront serves the
 * app and /api/* from one domain, so there is no CORS and no second hostname.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
