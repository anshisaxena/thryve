import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Email } from './email';

describe('EmailComponent', () => {
  let component: Email;
  let fixture: ComponentFixture<Email>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, Email], // standalone
    }).compileComponents();

    fixture = TestBed.createComponent(Email);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the Email component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the TANDEM logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent).toContain('TANDEM');
  });

  it('should bind email input with ngModel', async () => {
    const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
    inputEl.value = 'test@example.com';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.email).toBe('test@example.com');
  });

  it('should call submitEmail() when Continue button is clicked', () => {
    spyOn(component, 'submitEmail');

    const button = fixture.debugElement.query(By.css('.btn')).nativeElement;
    button.click();

    expect(component.submitEmail).toHaveBeenCalled();
  });
});
