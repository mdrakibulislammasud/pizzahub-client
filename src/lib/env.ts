const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

export const env = {
  apiUrl: (apiUrl || "http://localhost:5000").replace(/\/$/, ""),
  appUrl: (appUrl || "http://localhost:3000").replace(/\/$/, "")
} as const;

export const API_BASE_URL = `${env.apiUrl}/api`;
