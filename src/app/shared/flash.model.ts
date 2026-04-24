export interface Flash {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning'; // le type influe sur la couleur et l'icône du flash-message
  fadingOut?: boolean;
}
