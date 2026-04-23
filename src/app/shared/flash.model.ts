export interface Flash {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  fadingOut?: boolean;
}
