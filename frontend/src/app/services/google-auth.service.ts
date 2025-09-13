import { Injectable } from '@angular/core';
import { loadGapiInsideDOM } from 'gapi-script';

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private clientId = '373913018417-roka4udlri9hs8jqjlc53haq4rp4uqal.apps.googleusercontent.com'; // Replace with your client ID
  private auth2: gapi.auth2.GoogleAuth | undefined;

  async initGoogleAuth(): Promise<void> {
    await loadGapiInsideDOM();
    await new Promise((resolve) => {
      gapi.load('auth2', () => {
        this.auth2 = gapi.auth2.init({
          client_id: this.clientId,
  cookie_policy: 'single_host_origin',
          scope: 'profile email',
        });
        resolve(null);
      });
    });
  }

  async signIn(): Promise<gapi.auth2.GoogleUser> {
    if (!this.auth2) {
      await this.initGoogleAuth();
    }
    return this.auth2!.signIn();
  }

  signOut(): void {
    this.auth2?.signOut();
  }
}
