import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para redirecionar em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Dispara evento para o app saber que precisa fazer logout
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post<LoginResponse>('/auth/register', { name, email, password }),

  me: () =>
    api.get<{ user: AuthUser }>('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),

  // Google OAuth
  getGoogleAuthUrl: () =>
    api.get<{ url: string }>('/auth/google/url'),

  loginWithGoogle: (code: string) =>
    api.post<LoginResponse>('/auth/google/token', { code }),
};

// ==================== Tenant ====================
export const tenantApi = {
  getDemoTenant: () =>
    api.get<{ tenant: { id: string; name: string; slug: string } }>('/tenants/demo'),
};

// ==================== WhatsApp ====================
export const whatsappApi = {
  startSession: (sessionId: string) =>
    api.post(`/whatsapp/sessions/${encodeURIComponent(sessionId)}/start`),

  getSessionQr: (sessionId: string) =>
    api.get<{ sessionId: string; qr: string | null }>(
      `/whatsapp/sessions/${encodeURIComponent(sessionId)}/qr`
    ),

  getSessionStatus: (sessionId: string) =>
    api.get<{ sessionId: string; status: string }>(
      `/whatsapp/sessions/${encodeURIComponent(sessionId)}/status`
    ),

  listSessions: () =>
    api.get<{ sessions: Array<{ sessionId: string; status: string }> }>('/whatsapp/sessions'),

  disconnectSession: (sessionId: string) =>
    api.delete(`/whatsapp/sessions/${encodeURIComponent(sessionId)}`),
};

// ==================== Chat ====================
export interface Chat {
  id: string;
  customerWaId: string;
  customerName?: string;
  lastMessageAt?: string;
  aiPaused: boolean;
  status: string;
  createdAt: string;
  _count?: { messages: number };
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  role: 'user' | 'assistant' | 'agent';
  type: 'text' | 'audio' | 'image' | 'file';
  text?: string;
  mediaUrl?: string;
  createdAt: string;
}

export const chatApi = {
  listChats: (tenantId: string) =>
    api.get<{ chats: Chat[] }>(`/chats?tenantId=${tenantId}`),

  getChat: (chatId: string) =>
    api.get<{ chat: Chat }>(`/chats/${chatId}`),

  getMessages: (chatId: string, limit?: number) =>
    api.get<{ messages: Message[] }>(`/chats/${chatId}/messages${limit ? `?limit=${limit}` : ''}`),

  toggleAiPause: (chatId: string, paused: boolean) =>
    api.patch<{ chat: Chat }>(`/chats/${chatId}`, { aiPaused: paused }),

  sendMessage: (sessionId: string, to: string, text: string) =>
    api.post(`/whatsapp/sessions/${encodeURIComponent(sessionId)}/send`, { to, text }),
};

// ==================== Knowledge Base ====================
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: { documents: number };
}

export interface Document {
  id: string;
  title: string;
  sourceType: string;
  status: string;
  createdAt: string;
  _count?: { chunks: number };
}

export const knowledgeApi = {
  // Bases de conhecimento
  listKnowledgeBases: (tenantId: string) =>
    api.get<{ knowledgeBases: KnowledgeBase[] }>(`/documents/knowledge-bases?tenantId=${tenantId}`),

  createKnowledgeBase: (tenantId: string, name: string, description?: string) =>
    api.post<{ knowledgeBase: KnowledgeBase }>('/documents/knowledge-bases', {
      tenantId,
      name,
      description,
    }),

  deleteKnowledgeBase: (id: string) =>
    api.delete(`/documents/knowledge-bases/${id}`),

  // Documentos
  listDocuments: (knowledgeBaseId: string) =>
    api.get<{ documents: Document[] }>(`/documents?knowledgeBaseId=${knowledgeBaseId}`),

  createDocument: (data: {
    tenantId: string;
    knowledgeBaseId: string;
    title: string;
    sourceType: string;
    content: string;
  }) => api.post<{ document: Document }>('/documents', data),

  deleteDocument: (id: string) =>
    api.delete(`/documents/${id}`),

  // Busca RAG
  search: (tenantId: string, query: string, limit?: number) =>
    api.post<{ results: Array<{ content: string; score: number; documentTitle: string }> }>(
      '/documents/search',
      { tenantId, query, limit }
    ),
};

// ==================== Calendar ====================
export interface GoogleAccount {
  id: string;
  email: string;
  tokenExpiresAt: string;
  createdAt: string;
  calendars: Array<{
    id: string;
    calendarId: string;
    summary: string;
    isDefault: boolean;
  }>;
}

export interface Appointment {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  payload?: { summary?: string; description?: string; htmlLink?: string };
  googleCalendar?: { summary: string };
}

export const calendarApi = {
  // OAuth
  getAuthUrl: (tenantId: string) =>
    `${API_URL}/calendar/oauth/authorize?tenantId=${tenantId}`,

  // Contas Google
  listAccounts: (tenantId: string) =>
    api.get<{ accounts: GoogleAccount[] }>(`/calendar/accounts?tenantId=${tenantId}`),

  syncCalendars: (accountId: string, tenantId: string) =>
    api.post(`/calendar/accounts/${accountId}/sync?tenantId=${tenantId}`),

  // Eventos
  createEvent: (data: {
    tenantId: string;
    googleCalendarId: string;
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone?: string;
  }) => api.post<{ event: any }>('/calendar/events', data),

  listAppointments: (tenantId: string) =>
    api.get<{ appointments: Appointment[] }>(`/calendar/appointments?tenantId=${tenantId}`),

  cancelAppointment: (id: string) =>
    api.delete(`/calendar/appointments/${id}`),

  getAvailableSlots: (googleCalendarId: string, date: string) =>
    api.get<{ slots: Array<{ start: string; end: string }> }>(
      `/calendar/slots?googleCalendarId=${googleCalendarId}&date=${date}`
    ),

  getEvents: (googleCalendarId: string, start: string, end: string) =>
    api.get<{
      events: Array<{
        id: string;
        title: string;
        start: string;
        end: string;
        allDay: boolean;
        source: 'google' | 'ai';
        htmlLink?: string;
      }>;
    }>(`/calendar/events?googleCalendarId=${googleCalendarId}&start=${start}&end=${end}`),
};

// ==================== Stats / Dashboard ====================
export interface DashboardStats {
  conversations: {
    total: number;
    thisWeek: number;
    change: string;
    trend: 'up' | 'down' | 'neutral';
  };
  appointments: {
    total: number;
    thisWeek: number;
    change: string;
    trend: 'up' | 'down' | 'neutral';
  };
  aiResolution: {
    rate: number;
    totalMessages: number;
    aiMessages: number;
    manualChats: number;
  };
}

export interface ChartData {
  name: string;
  messages: number;
  inbound: number;
  outbound: number;
}

export interface RecentAppointment {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  summary: string;
  customerName: string;
  calendarName: string;
  createdAt: string;
}

export const statsApi = {
  getDashboardStats: (tenantId: string) =>
    api.get<DashboardStats>(`/stats/dashboard?tenantId=${tenantId}`),

  getMessagesChart: (tenantId: string, days: number = 7) =>
    api.get<{ data: ChartData[] }>(`/stats/messages-chart?tenantId=${tenantId}&days=${days}`),

  getRecentAppointments: (tenantId: string, limit: number = 5) =>
    api.get<{ appointments: RecentAppointment[] }>(
      `/stats/recent-appointments?tenantId=${tenantId}&limit=${limit}`
    ),
};

// ==================== Agent Config ====================
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface AgentSettings {
  agentName: string;
  voiceTone: 'professional' | 'friendly' | 'empathetic' | 'direct';
  systemPrompt: string;
  businessHours: {
    enabled: boolean;
    schedule: {
      [key: string]: { start: string; end: string; enabled: boolean };
    };
    outsideHoursMessage: string;
  };
  welcomeMessage: {
    enabled: boolean;
    message: string;
  };
  faqs: FaqItem[];
}

export const agentApi = {
  getConfig: (tenantId: string) =>
    api.get<{ settings: AgentSettings }>(`/agent/config?tenantId=${tenantId}`),

  updateConfig: (tenantId: string, settings: Partial<AgentSettings>) =>
    api.patch<{ settings: AgentSettings; message: string }>('/agent/config', {
      tenantId,
      settings,
    }),
};
