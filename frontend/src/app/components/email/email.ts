import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-email',
  imports: [],
  templateUrl: './email.html',
    changeDetection: ChangeDetectionStrategy.OnPush,

  styleUrl: './email.css'
})
export class Email {
 handleContinue() {
    // Logic for the continue button can be added here
    console.log('Continue button clicked!');
  }
}
