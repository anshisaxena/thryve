import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Otp } from './otp';

describe('Otp', () => {
  let component: Otp;
  let fixture: ComponentFixture<Otp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, Otp], // standalone
    }).compileComponents();

    fixture = TestBed.createComponent(Otp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the OTP component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the Verify button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn')?.textContent).toContain('Verify');
  });

  it('should bind otp input with ngModel', async () => {
    const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
    inputEl.value = '123456';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.otp).toBe('123456');
  });

  it('should call verifyOtp() when Verify button is clicked', () => {
    spyOn(component, 'verifyOtp');

    const button = fixture.debugElement.query(By.css('.btn')).nativeElement;
    button.click();

    expect(component.verifyOtp).toHaveBeenCalled();
  });
});
