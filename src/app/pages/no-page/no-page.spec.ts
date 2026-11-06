import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoPage } from './no-page';
import { provideRouter } from '@angular/router';

describe('NoPage', () => {
  let component: NoPage;
  let fixture: ComponentFixture<NoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoPage],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche un titre de niveau 1 « Page introuvable »', () => {
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Page introuvable');
  });
});
