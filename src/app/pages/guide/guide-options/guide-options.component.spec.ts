import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {GuideOptionsComponent} from './guide-options.component';
import {provideInMemoryPreferences} from '../../../core/preferences/testing/in-memory-preferences.store';
import {I18nService} from '../../../core/i18n/i18n.service';

describe('GuideOptionsComponent', () => {
  let fixture: ComponentFixture<GuideOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideOptionsComponent],
      providers: [provideRouter([]), provideInMemoryPreferences()]
    }).compileComponents();
  });

  it('affiche la version française par défaut', () => {
    fixture = TestBed.createComponent(GuideOptionsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Options et accessibilité');
  });

  it('affiche la version anglaise quand l\'interface est en anglais', () => {
    TestBed.inject(I18nService).setLanguage('en');
    fixture = TestBed.createComponent(GuideOptionsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Options and accessibility');
  });
});
