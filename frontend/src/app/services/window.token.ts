/* istanbul ignore file */
import { InjectionToken } from '@angular/core';

export const WINDOW = new InjectionToken<Window>(
  'Window',
  {
    providedIn: 'root',
    factory(): Window {
      return window;
    }
  }
);
