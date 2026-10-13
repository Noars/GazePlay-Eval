import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {GuideSauvegardeComponent} from './guide-sauvegarde.component';
import {FlashService} from '../../../services/flash-message/flash.service';
import {UserPreferencesService} from '../../../core/preferences/user-preferences.service';

describe('GuideSauvegardeComponent', () => {
  let component: GuideSauvegardeComponent;
  let fixture: ComponentFixture<GuideSauvegardeComponent>;
  let flashServiceSpy: jasmine.SpyObj<FlashService>;
  let preferencesSpy: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(async () => {
    flashServiceSpy = jasmine.createSpyObj('FlashService', ['show']);
    preferencesSpy = jasmine.createSpyObj('UserPreferencesService', ['update']);
    preferencesSpy.update.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [GuideSauvegardeComponent],
      providers: [
        {provide: FlashService, useValue: flashServiceSpy},
        {provide: UserPreferencesService, useValue: preferencesSpy},
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuideSauvegardeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('a un titre de page de niveau 1', () => {
    expect(fixture.nativeElement.querySelector('h1')).not.toBeNull();
  });

  it('resetDuration → enregistre 3 secondes dans les préférences et confirme', async () => {
    await component.resetDuration();

    expect(preferencesSpy.update).toHaveBeenCalledWith({messageDuration: 3});
    expect(flashServiceSpy.show).toHaveBeenCalledWith(
      'success',
      'La durée d\'affichage des notifications a été définie à 3 secondes.',
      3000
    );
  });

  it('resetDuration — échec d\'enregistrement → message d\'erreur', async () => {
    preferencesSpy.update.and.returnValue(Promise.resolve(false));
    await component.resetDuration();
    expect(flashServiceSpy.show).toHaveBeenCalledWith('error', jasmine.any(String), 3000);
  });
});
