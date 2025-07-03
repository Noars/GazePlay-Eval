import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private theme = signal<'light' | 'dark'>('light');

  constructor() {
    this.applySavedTheme();
    console.log("Apply saved theme ! -> " + this.theme());
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    console.log("New theme ! -> " + this.theme())
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
    this.applyThemeToBody(theme);
    localStorage.setItem('theme', theme);
  }

  getTheme(){
    return this.theme();
  }

  applySavedTheme() {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const themeToApply = saved ?? 'light';
    this.theme.set(themeToApply);
    this.applyThemeToBody(themeToApply);
  }

  private applyThemeToBody(theme: 'light' | 'dark') {
    document.body.setAttribute('data-bs-theme', theme);
  }
}
