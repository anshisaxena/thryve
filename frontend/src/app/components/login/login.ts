import { Component, Input, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnDestroy {
  @Input() title?: string;

  // UI state
  showGoogleLoginModal = false;
  showAppleBiometricModal = false;
  showPasskeyQRCode = false;
  showAccountCreatedPopup = false;

  // Session state
  qrImage: string | null = null;
  sessionId: string | null = null;
  pollingSub: Subscription | null = null;

  // Backend URLs
  backendBase = 'https://9dc88d2115df.ngrok-free.app';
  tunnelUrl = 'https://9dc88d2115df.ngrok-free.app';

  constructor(
    public router: Router,
    private http: HttpClient,
    private googleAuthService: GoogleAuthService
  ) {}

  /** Start a new passkey session */
  loginWithPasskey() {
    if (!this.backendBase) {
      console.error('Backend URL is not set!');
      return;
    }

    this.http.post<{ sessionId: string; qrImage: string; confirmUrl: string }>(
      `${this.backendBase}/api/passkey/session`,
      { baseUrl: this.tunnelUrl },
      { withCredentials: true }
    ).subscribe({
      next: (resp) => {
        console.log('✅ Passkey session started', resp);
        this.sessionId = resp.sessionId;
        this.qrImage = resp.qrImage;
        this.showPasskeyQRCode = true;
        this.startPolling();
      },
      error: (err) => {
        console.error('❌ Error starting passkey session', err);

        if (err.status === 0) {
          alert('Cannot reach backend. Check ngrok URL and CORS settings.');
        } else {
          alert(`Error starting session: ${err.message || 'Unknown error'}`);
        }
      }
    });
  }

  /** Poll backend every 2s for session status */
/** Poll backend every 2s for session status */
startPolling() {
  if (!this.sessionId) return;

  this.pollingSub?.unsubscribe();
  this.pollingSub = interval(2000).subscribe(() => {
    this.http.get(
      `${this.backendBase}/api/passkey/status/${this.sessionId}`,
      { responseType: 'text' } // We want raw text first
    ).subscribe({
      next: (respText) => {
        try {
          // Defensive: if response looks like HTML, throw error to catch
          if (respText.trim().startsWith('<')) {
            throw new Error('Response is HTML, not JSON');
          }
          const resp = JSON.parse(respText);
          console.log('📡 Polling status:', resp.status);
          if (resp.status === 'authenticated') {
            this.pollingSub?.unsubscribe();
            this.showPasskeyQRCode = false;
            this.onAuthenticated();
          } else if (resp.status === 'expired') {
            this.pollingSub?.unsubscribe();
            this.showPasskeyQRCode = false;
            alert('QR expired. Please try again.');
          }
        } catch (err) {
          console.error('❌ Polling response is not valid JSON:', err, respText);
          this.pollingSub?.unsubscribe();
          alert('Unexpected response from server during polling. Please check backend logs.');
        }
      },
      error: (err) => {
        console.error('❌ Polling error', err);
        this.pollingSub?.unsubscribe();
      }
    });
  });
}


      
  /** Session confirmed */
  onAuthenticated() {
    console.log('✅ Session authenticated!');

    localStorage.setItem('showAccountCreated', 'true');
    this.router.navigate(['/email']);
  }

  /** Manual session confirm for testing */
  confirmSessionManually() {
    if (!this.sessionId) return;
    const fakeUserId = 'test-user-123';
    this.http.post(
      `${this.backendBase}/passkey/confirm/${this.sessionId}`,
      { userId: fakeUserId }
    ).subscribe({
      next: () => console.log('✅ Session confirmed manually'),
      error: (err) => console.error('❌ Manual confirm error', err)
    });
  }

  /** Close passkey QR popup */
  closePasskeyPopup() {
    this.showPasskeyQRCode = false;
    this.pollingSub?.unsubscribe();
  }

  /** Close account created popup */
  closeAccountCreated() {
    this.showAccountCreatedPopup = false;
  }

  /** Google OAuth */
  performGoogleOAuth() {
    this.showGoogleLoginModal = true;
  }

  closeGoogleLoginModal() {
    this.showGoogleLoginModal = false;
  }

  async loginWithGoogle() {
    try {
      const user = await this.googleAuthService.signIn();
      const profile = user.getBasicProfile();
      console.log('Google user:', profile.getEmail());
      this.closeGoogleLoginModal();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
    }
  }

  /** Apple login */
  loginWithApple() {
    this.showAppleBiometricModal = true;
  }

  closeAppleBiometricPopup() {
    this.showAppleBiometricModal = false;
  }

  /** Email login */
  loginWithEmail() {
    this.router.navigate(['/email']);
  }

  /** Navigate to dashboard */
  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /** Cleanup */
  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }
}
