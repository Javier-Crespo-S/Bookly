const getBackendUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (!backendUrl) throw new Error("VITE_BACKEND_URL is not defined in .env");
  return backendUrl.replace(/\/$/, ""); 
};

export const authFetch = async (path, options = {}) => {
  const base = getBackendUrl();
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(base + path, { ...options, headers });
  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const msg = data?.error?.message || "Request failed";
    throw new Error(msg);
  }

  return data;
};

export const publicFetch = async (path, options = {}) => {
  const base = getBackendUrl();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const resp = await fetch(base + path, { ...options, headers });
  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const msg = data?.error?.message || "Request failed";
    throw new Error(msg);
  }

  return data;
};