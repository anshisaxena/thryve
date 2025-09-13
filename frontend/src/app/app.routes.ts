import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Email } from './components/email/email';
import { Otp } from './components/otp/otp';
export const routes: Routes = [


{ path: '', component: Login },
{ path: 'email', component: Email },
{ path: 'otp', component: Otp },
{ path: '**', redirectTo: '' }


];
