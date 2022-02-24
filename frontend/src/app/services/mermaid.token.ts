import { InjectionToken } from '@angular/core';
import { Mermaid } from 'mermaid';
import mermaid from 'mermaid';

export const MERMAID = new InjectionToken<Mermaid>(
  'Mermaid',
  {
    providedIn: 'root',
    factory(): Mermaid {
      return mermaid;
    }
  }
);
