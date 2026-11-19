import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {GuideDepannageComponent} from './guide-depannage.component';
import {provideInMemoryPreferences} from '../../../core/preferences/testing/in-memory-preferences.store';
import {I18nService} from '../../../core/i18n/i18n.service';

describe('GuideDepannageComponent', () => {
  let fixture: ComponentFixture<GuideDepannageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideDepannageComponent],
      providers: [provideRouter([]), provideInMemoryPreferences()]
    }).compileComponents();
  });

  it('affiche la version française par défaut', () => {
    fixture = TestBed.createComponent(GuideDepannageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Questions fréquentes et dépannage');
  });

  it('affiche la version anglaise quand l\'interface est en anglais', () => {
    TestBed.inject(I18nService).setLanguage('en');
    fixture = TestBed.createComponent(GuideDepannageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('FAQ and troubleshooting');
  });
});
