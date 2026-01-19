import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Try direct token first, then fall back to Zustand persist storage
    let token = localStorage.getItem('token');

    if (!token) {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/users/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/users/login', data),
  me: () => api.get('/users/me'),
};

// Videos API
export const videosApi = {
  upload: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
  },
  list: (page = 1, pageSize = 20) =>
    api.get(`/videos?page=${page}&page_size=${pageSize}`),
  get: (id: string) => api.get(`/videos/${id}`),
  delete: (id: string) => api.delete(`/videos/${id}`),
  process: (id: string) => api.post(`/videos/${id}/process`),
  chop: (id: string, segments: Array<{ start_time: number; end_time: number; title?: string }>) =>
    api.post(`/videos/${id}/chop`, { segments }),
  getFrames: (id: string, sceneChangesOnly = false, page = 1, pageSize = 50) =>
    api.get(`/videos/${id}/frames?scene_changes_only=${sceneChangesOnly}&page=${page}&page_size=${pageSize}`),
};

// SOPs API
export const sopsApi = {
  create: (data: {
    video_id?: string;
    title: string;
    description?: string;
    user_context?: string;
    start_time?: number;
    end_time?: number;
  }) => api.post('/sops', data),
  list: (page = 1, pageSize = 20, status?: string) => {
    let url = `/sops?page=${page}&page_size=${pageSize}`;
    if (status) url += `&status_filter=${status}`;
    return api.get(url);
  },
  get: (id: string) => api.get(`/sops/${id}`),
  update: (id: string, data: { title?: string; description?: string; user_context?: string }) =>
    api.put(`/sops/${id}`, data),
  delete: (id: string) => api.delete(`/sops/${id}`),
  generate: (id: string, options: {
    detail_level?: string;
    max_steps?: number;
    frame_sampling_strategy?: string;
  }) => api.post(`/sops/${id}/generate`, options),
  updateStep: (sopId: string, stepId: string, data: { title?: string; description?: string; screenshot_path?: string }) =>
    api.put(`/sops/${sopId}/steps/${stepId}`, data),
  createStep: (sopId: string, data: { step_number?: number; title?: string; description: string; screenshot_path?: string }) =>
    api.post(`/sops/${sopId}/steps`, data),
  deleteStep: (sopId: string, stepId: string) =>
    api.delete(`/sops/${sopId}/steps/${stepId}`),
  clearAnnotations: (sopId: string, stepId: string) =>
    api.delete(`/sops/${sopId}/steps/${stepId}/annotations`),
  addAnnotation: (sopId: string, stepId: string, annotation: {
    x_coordinate: number;
    y_coordinate: number;
    x_percentage: number;
    y_percentage: number;
    click_type?: string;
    element_description?: string;
    action_description?: string;
    sequence_order?: number;
  }) => api.post(`/sops/${sopId}/steps/${stepId}/annotations`, annotation),
  removeAnnotation: (sopId: string, stepId: string, annotationId: string) =>
    api.delete(`/sops/${sopId}/steps/${stepId}/annotations/${annotationId}`),
  reorder: (id: string, stepIds: string[]) =>
    api.post(`/sops/${id}/reorder`, { step_ids: stepIds }),
};

// Exports API
export const exportsApi = {
  toNotion: (sopId: string, config?: { database_id?: string; parent_page_id?: string }) =>
    api.post('/exports/notion', { sop_id: sopId, export_type: 'notion', config }),
  toPdf: (sopId: string) =>
    api.post(`/exports/pdf/${sopId}`, {}, { responseType: 'blob' }),
  list: (sopId?: string) => {
    let url = '/exports';
    if (sopId) url += `?sop_id=${sopId}`;
    return api.get(url);
  },
  get: (id: string) => api.get(`/exports/${id}`),
};

// Integrations API
export const integrationsApi = {
  list: () => api.get('/integrations'),
  connectGoogle: () => api.get('/integrations/google/connect'),
  connectNotion: () => api.get('/integrations/notion/connect'),
  disconnect: (provider: string) => api.delete(`/integrations/${provider}`),
  googleFolders: () => api.get('/integrations/google/folders'),
  notionDatabases: () => api.get('/integrations/notion/databases'),
  notionPages: () => api.get('/integrations/notion/pages'),
};

// Jobs API
export const jobsApi = {
  list: (status?: string, type?: string) => {
    let url = '/jobs?';
    if (status) url += `status_filter=${status}&`;
    if (type) url += `job_type=${type}`;
    return api.get(url);
  },
  get: (id: string) => api.get(`/jobs/${id}`),
  cancel: (id: string) => api.delete(`/jobs/${id}`),
};

// Audio API
export const audioApi = {
  list: (page = 1, pageSize = 20, status?: string) => {
    let url = `/audio?page=${page}&page_size=${pageSize}`;
    if (status) url += `&status_filter=${status}`;
    return api.get(url);
  },
  upload: (file: File, data?: { title?: string; description?: string; user_context?: string }, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data?.title) formData.append('title', data.title);
    if (data?.description) formData.append('description', data.description);
    if (data?.user_context) formData.append('user_context', data.user_context);
    return api.post('/audio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
  },
  generate: (sopId: string, options?: { detail_level?: string; language?: string; user_context?: string }) =>
    api.post(`/audio/${sopId}/generate`, options || {}),
  get: (sopId: string) => api.get(`/audio/${sopId}`),
  delete: (sopId: string) => api.delete(`/sops/${sopId}`),
};
