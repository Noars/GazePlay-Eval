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
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    component.scrollToBottom();

    expect(scrollToSpy).toHaveBeenCalled();

    const args = scrollToSpy.mock.lastCall![0];

    expect(args).toStrictEqual({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  });

  it('should call scrollToBottom when clicking the button', () => {
    const scrollToBottomSpy = vi.spyOn(component, 'scrollToBottom').mockImplementation(() => undefined);

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.scroll-bottom-button');

    button.click();

    expect(scrollToBottomSpy).toHaveBeenCalled();
  });
});
