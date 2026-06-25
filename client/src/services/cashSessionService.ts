import api from './api';

export interface CashSession {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  opening_balance: number;
  closing_balance: number | null;
  notes: string | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export const cashSessionService = {
  getCurrent: async (): Promise<CashSession | null> => {
    const { data } = await api.get('/cash-sessions/current');
    return data;
  },
  open: async (opening_balance: number, notes?: string): Promise<CashSession> => {
    const { data } = await api.post('/cash-sessions/open', { opening_balance, notes });
    return data;
  },
  close: async (closing_balance: number, notes?: string): Promise<CashSession> => {
    const { data } = await api.post('/cash-sessions/close', { closing_balance, notes });
    return data;
  },
  list: async (params?: { date?: string; user_id?: string }): Promise<CashSession[]> => {
    const { data } = await api.get('/cash-sessions', { params });
    return data;
  },
};
