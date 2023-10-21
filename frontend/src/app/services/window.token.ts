/* istanbul ignore file */
import { InjectionToken } from '@angular/core';

export interface WindowService extends Window {
  console: Console;
  acquireVsCodeApi(): {
    postMessage: (message: any) => void;
  };
}

export const WINDOW = new InjectionToken<WindowService>('Window', {
  providedIn: 'root',
  factory(): WindowService {
    return window as unknown as WindowService;
  },
});
