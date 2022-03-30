/* istanbul ignore file */
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { ButtonComponent } from './components/button/button.component';
import { MERMAID } from './services/mermaid.token';
import { WINDOW } from './services/window.token';
let list: (e: Event) => void;
const fakeWindowProvider = ({
  provide: WINDOW, useFactory: () => ({
    removeEventListener: (type: string, listener: () => void) => {
      list = undefined as any as (e: Event) => void;
    },
    addEventListener: (type: string, listener: () => void) => {
      list = listener;
    },
    dispatchEvent: (e: Event) => list(e),
    document: {
      addEventListener: (type: string, listener: () => void) => {
        list = listener;
      },
      getElementsByTagName: (tag: string) => [
        {
          hasAttribute: (attribute: string) => false,
          getAttribute: (attribute: string) => '',

        }
      ]
    }
  })
});

const fakeMermaidProvider = ({
  provide: MERMAID, useFactory: () => ({
    render: (id: string, markdown: string, callback: () => void) => jasmine.createSpy(),
    initialize: jasmine.createSpy(),
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

