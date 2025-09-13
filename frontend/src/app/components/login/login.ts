import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  @Input() title?: string;
  showPasskeyQRCode = false;

  // ✅ inject Router in constructor
  constructor(private router: Router) {}

  loginWithPasskey() {
    console.log("Passkey login clicked");
    this.showPasskeyQRCode = true;
    // TODO: Integrate WebAuthn / Passkey API
  }

  closePasskeyPopup() {
    this.showPasskeyQRCode = false;
  }

  loginWithGoogle() {
    console.log("Google login clicked");
    // TODO: Redirect to Google OAuth
  }

  showAppleBiometricModal = false;

loginWithApple() {
  console.log("Apple login clicked");
  this.showAppleBiometricModal = true;
}

closeAppleBiometricPopup() {
  this.showAppleBiometricModal = false;
}


  loginWithEmail() {
    console.log("Email login clicked");
    // TODO: Navigate to email login form
    this.router.navigate(['/email']);
  }
}
