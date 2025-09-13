import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email.html',
  styleUrls: ['./email.css']
})
export class Email {
  email: string = '';

  constructor(private router: Router) {}

  submitEmail() {
    if (this.email) {
      console.log('Sending OTP to:', this.email);

      // TODO: backend call to send OTP
      this.router.navigate(['/otp'], { state: { email: this.email } });
    }
  }
}
