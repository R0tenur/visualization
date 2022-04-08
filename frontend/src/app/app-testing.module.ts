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
      removeEventListener: (_: string, __: () => void) => {
        list = undefined as any as (e: Event) => void;
      },
      dispatchEvent: (e: Event) => list(e),
      getElementsByTagName: (_: string) => [
        fakeElement
      ],
      getElementById: (__: string) => fakeElement,
      querySelector: (__: string) => fakeElement
    }
  })
});
const fakeElement = {
  clientWidth: 100,
  clientHeight: 100,
  hasAttribute: (___: string) => false,
  getAttribute: (___: string) => '',
  removeAttribute: (___: string) => { }, // NOSONAR - removeAttribute is for testing
  setAttribute: (___: string, ____: string) => { }, // NOSONAR - setAttibute is for testing
};

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

