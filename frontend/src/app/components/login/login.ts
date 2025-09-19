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
  backendBase ='https://f5deed31b429.ngrok-free.app';
  tunnelUrl = 'https://f5deed31b429.ngrok-free.app';

  constructor(
    public router: Router,
    private http: HttpClient,
    private googleAuthService: GoogleAuthService
  ) {}

  // Helper: Get or create a userId and store in sessionStorage
  getOrCreateUserId(): string {
    let userId = sessionStorage.getItem('userId');
    if (!userId) {
      userId = this.generateUUID();
      sessionStorage.setItem('userId', userId);
    }
    return userId;
  }

  // Simple UUID generator
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** Start a new passkey session */
  loginWithPasskey() {
    if (!this.backendBase) {
      console.error('Backend URL is not set!');
      return;
    }

    const userId = this.getOrCreateUserId();

    this.http.post<{ sessionId: string; qrImage: string; confirmUrl: string; userId: string }>(
      `${this.backendBase}/api/passkey/session`,
      { baseUrl: this.tunnelUrl, userId }, // Send userId here
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
  startPolling() {
    if (!this.sessionId) return;

    this.pollingSub?.unsubscribe();
    this.pollingSub = interval(2000).subscribe(() => {
      this.http.get<{ status: string }>(
        `${this.backendBase}/api/passkey/status/${this.sessionId}`,
        { withCredentials: true }
      ).subscribe({
        next: (resp) => {
          console.log('📡 Polling status:', resp.status);

          if (resp.status === 'authenticated') {
            this.pollingSub?.unsubscribe();
            this.showPasskeyQRCode = false;

            // User is authenticated, userId is stored in sessionStorage already
            this.checkUserRedirect();
          } else if (resp.status === 'expired') {
            this.pollingSub?.unsubscribe();
            this.showPasskeyQRCode = false;
            alert('QR expired. Please try again.');
          }
        },
        error: (err) => {
          console.error('❌ Polling error', err);
          this.pollingSub?.unsubscribe();
          alert('Error during polling. Please check backend and network.');
        }
      });
    });
  }

  /** Check if user exists and redirect accordingly */
  checkUserRedirect() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
      // No userId? Redirect to email registration page
      this.router.navigate(['/email']);
      return;
    }

    // Call backend to check if user exists
    this.http.get<{ exists: boolean }>(
      `${this.backendBase}/api/users/exists/${userId}`,
      { withCredentials: true }
    ).subscribe({
      next: (resp) => {
        if (resp.exists) {
          // User exists: navigate to dashboard (login success)
          this.router.navigate(['/dashboard']);
        } else {
          // User new: navigate to email registration
          this.router.navigate(['/email']);
        }
      },
      error: () => {
        // On error fallback to email registration page
        this.router.navigate(['/email']);
      }
    });
  }

  /** Manual session confirm for testing */
  confirmSessionManually() {
    if (!this.sessionId) return;
    const fakeUserId = 'test-user-123';
    this.http.post(
      `${this.backendBase}/api/passkey/confirm/${this.sessionId}`,
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

  /** Cleanup */
  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }
}
