import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp.html',
  styleUrls: ['./otp.css']
})
export class Otp {
  otp: string[] = ['', '', '', '', '', ''];
  email: string = '';

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.email = nav?.extras.state?.['email'] || '';
  }

  moveNext(event: any, index: number) {
    if (event.target.value && index < 5) {
      const next = document.getElementById('otp-' + (index + 1));
      next?.focus();
    }
  }
  
  

handleKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (input.value) {
        // clear current
        this.otp[index] = '';
        input.value = '';
      } else if (index > 0) {
        // move back if empty
        const prev = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        prev?.focus();
      }
    }
  }


  verifyOtp() {
    const enteredOtp = this.otp.join('');
    console.log('Verifying OTP:', enteredOtp);

    if (enteredOtp.length === 6) {
      alert('OTP Verified ✅');
      this.router.navigate(['/dashboard']);
    } else {
      alert('Invalid OTP ❌');
    }
  }
}
