const BASE_URL = 'http://localhost:8000/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options?.headers },
    });

    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/auth';
      throw new Error('Sessão expirada');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || body.message || `Erro ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  hasToken() {
    return !!this.token;
  }

  // ─── Auth ───────────────────────────────────────────
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(payload: Record<string, unknown>) {
    const data = await this.request<{ access_token: string; token_type: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request<Record<string, unknown>>('/auth/me');
  }

  async refreshToken() {
    const data = await this.request<{ access_token: string }>('/auth/refresh', { method: 'POST' });
    this.setToken(data.access_token);
    return data;
  }

  // ─── Contas ─────────────────────────────────────────
  async getContas(params?: { mes?: number; ano?: number; tipo?: string; status?: string }) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<unknown[]>(`/contas${qs}`);
  }

  async createConta(data: Record<string, unknown>) {
    return this.request<unknown>('/contas', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateConta(id: string, data: Record<string, unknown>) {
    return this.request<unknown>(`/contas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteConta(id: string) {
    return this.request<void>(`/contas/${id}`, { method: 'DELETE' });
  }

  async togglePagamento(id: string) {
    return this.request<unknown>(`/contas/${id}/toggle-pagamento`, { method: 'PATCH' });
  }

  async getContasEstatisticas(mes?: number, ano?: number) {
    const qs = mes && ano ? `?mes=${mes}&ano=${ano}` : '';
    return this.request<Record<string, unknown>>(`/contas/estatisticas${qs}`);
  }

  // ─── Dashboard ──────────────────────────────────────
  async getDashboard() {
    return this.request<Record<string, unknown>>('/dashboard');
  }

  async getResumoMensal(mes: number, ano: number) {
    return this.request<Record<string, unknown>>(`/dashboard/resumo?mes=${mes}&ano=${ano}`);
  }

  async getEvolucao() {
    return this.request<unknown[]>('/dashboard/evolucao');
  }

  // ─── Análises ───────────────────────────────────────
  async getAnalises() {
    return this.request<unknown[]>('/analises');
  }

  async gerarAnalise() {
    return this.request<unknown>('/analises/gerar', { method: 'POST' });
  }

  // ─── Investimentos ─────────────────────────────────
  async getInvestimentos() {
    return this.request<unknown[]>('/investimentos');
  }

  async createInvestimento(data: Record<string, unknown>) {
    return this.request<unknown>('/investimentos', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteInvestimento(id: string) {
    return this.request<void>(`/investimentos/${id}`, { method: 'DELETE' });
  }

  // ─── Usuários ──────────────────────────────────────
  async updateUsuario(data: Record<string, unknown>) {
    return this.request<unknown>('/usuarios/me', { method: 'PUT', body: JSON.stringify(data) });
  }

  // ─── Categorias ────────────────────────────────────
  async getCategorias() {
    return this.request<unknown[]>('/categorias');
  }
}

export const api = new ApiService();
