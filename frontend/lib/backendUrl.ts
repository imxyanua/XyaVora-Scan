export function getBackendUrl() {
  const url = process.env.API_URL?.trim();
  if (!url) {
    throw new Error("API_URL is not configured. Set it to the FastAPI backend URL.");
  }
  return url.replace(/\/+$/, "");
}
