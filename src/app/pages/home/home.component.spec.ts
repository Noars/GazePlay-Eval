import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { Router } from '@angular/router';
import { SaveService } from '../../services/save/save.service';
import { By } from '@angular/platform-browser';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['newSaveDataAuto']);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: SaveService, useValue: saveServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait appeler SaveService.newSaveDataAuto et naviguer vers /info-eval', () => {
    component.goToInfoEval();

    expect(saveServiceSpy.newSaveDataAuto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-eval']);
  });

  it('devrait déclencher goToInfoEval quand on clique sur le bouton', () => {
    spyOn(component, 'goToInfoEval');
    const button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', null);

    expect(component.goToInfoEval).toHaveBeenCalled();
  });
});
