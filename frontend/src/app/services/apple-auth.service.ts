import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppleAuthService {
  private clientId = 'com.your.service.id';           // Services ID from Apple
  private redirectUri = 'https://your-backend.com/api/apple/callback'; // backend callback
  private scope = 'name email';

  /** Build the Apple authorize URL and store state */
  getAppleLoginUrl(): string {
    const state = this.generateUUID();
    sessionStorage.setItem('apple_oauth_state', state);
    const params = new URLSearchParams({
      response_type: 'code',               // we'll exchange code server-side
      response_mode: 'form_post',          // Apple will POST to redirectUri
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
