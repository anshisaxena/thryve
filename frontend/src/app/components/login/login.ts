import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  @Input() title?: string;
  showGoogleLoginModal = false;
  showAppleBiometricModal = false;
  showPasskeyQRCode = false;

  constructor(private router: Router, private googleAuthService: GoogleAuthService) {}

  loginWithPasskey() {
    console.log("Passkey login clicked");
    this.showPasskeyQRCode = true;
  }

  closePasskeyPopup() {
    this.showPasskeyQRCode = false;
  }

  loginWithGoogle() {
    console.log("Google login clicked");
    this.showGoogleLoginModal = true;
  }

  closeGoogleLoginModal() {
    this.showGoogleLoginModal = false;
  }

  async performGoogleOAuth() {
    try {
      const user = await this.googleAuthService.signIn();
      const profile = user.getBasicProfile();

      console.log('User signed in:');
      console.log('ID: ' + profile.getId());
      console.log('Name: ' + profile.getName());
      console.log('Email: ' + profile.getEmail());
      console.log('Image URL: ' + profile.getImageUrl());

      this.closeGoogleLoginModal();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  }

  loginWithApple() {
    console.log("Apple login clicked");
    this.showAppleBiometricModal = true;
  }

  closeAppleBiometricPopup() {
    this.showAppleBiometricModal = false;
  }

  loginWithEmail() {
    console.log("Email login clicked");
    this.router.navigate(['/email']);
  }
}
