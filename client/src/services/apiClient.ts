import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/public',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sigecat_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// When PHP emits debug output before JSON, the body arrives as a plain string.
// Extract the JSON object from it so the rest of the app works normally.
apiClient.interceptors.response.use((response) => {
  if (typeof response.data === 'string') {
    const match = (response.data as string).match(/\{[\s\S]*\}/);
    if (match) {
      try { response.data = JSON.parse(match[0]); } catch { /* leave as-is */ }
    }
  }
  return response;
});

export default apiClient;
