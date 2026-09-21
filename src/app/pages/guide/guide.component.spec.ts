import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuideComponent } from './guide.component';

describe('GuideComponent', () => {
  let component: GuideComponent;
  let fixture: ComponentFixture<GuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should scroll to the bottom of the page', () => {
    const scrollToSpy = spyOn(window, 'scrollTo').and.stub();

    component.scrollToBottom();

    expect(scrollToSpy).toHaveBeenCalled();

    const args = scrollToSpy.calls.mostRecent().args[0];

    expect(args).toEqual({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  });

  it('should call scrollToBottom when clicking the button', () => {
    const scrollToBottomSpy = spyOn(component, 'scrollToBottom');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.scroll-bottom-button');

    button.click();

    expect(scrollToBottomSpy).toHaveBeenCalled();
  });
});
