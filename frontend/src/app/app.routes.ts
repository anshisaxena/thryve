import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Email } from './components/email/email';
export const routes: Routes = [


{ path: '', component: Login },
{ path: 'email', component: Email }



];
