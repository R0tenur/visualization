/* istanbul ignore file */
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { ButtonComponent } from './components/button/button.component';
import { WINDOW } from './services/window.token';
let list: (e: Event) => void;
const fakeWindowProvider = ({
  provide: WINDOW, useFactory: () => ({
    innerHeight: 100,
    innerWidth: 100,
    removeEventListener: (_: string, __: () => void) => {
      list = undefined as any as (e: Event) => void;
    },
    addEventListener: (_: string, listener: () => void) => {
      list = listener;
    },
    dispatchEvent: (e: Event) => list(e),
    document: {
      addEventListener: (_: string, listener: () => void) => {
        list = listener;
      },
      getElementsByTagName: (_: string) => [
        {
          hasAttribute: (__: string) => false,
          getAttribute: (__: string) => '',

        }
      ]
    }
  })
});

@NgModule({
  declarations: [
    ButtonComponent,
  ],
  imports: [
    RouterTestingModule.withRoutes([]),
    ReactiveFormsModule
  ],
  providers: [fakeWindowProvider],
  exports: [ButtonComponent, RouterTestingModule, ReactiveFormsModule]
})
export class AppTestingModule { }

