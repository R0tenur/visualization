/* istanbul ignore file */
import { InjectionToken } from '@angular/core';
import { State } from '../state/state';

const states: Record<string, any> = {};

export const StateInjector = <T>(key: string) => {
  return new InjectionToken<State<T>>(
    key,
    {
      providedIn: 'root',
      factory: () => {
        if (states.hasOwnProperty(key)) {
          return states[key];
        }
        states[key] = new State<T>();

        return states[key];
      },
    }
  );
};
