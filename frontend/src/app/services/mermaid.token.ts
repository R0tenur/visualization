import { InjectionToken } from '@angular/core';
import * as mermaid from 'mermaid';

export const MERMAID = new InjectionToken<any>('Mermaid', {
  providedIn: 'root',
  factory(): any {
    return mermaid.default;
  },
});
