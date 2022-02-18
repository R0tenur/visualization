import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from './components/button/button.component';

@NgModule({
  declarations: [
    ButtonComponent,
  ],
  imports: [
    FormsModule,
  ],
  exports: [ButtonComponent, FormsModule]
})
export class AppTestingModule { }
