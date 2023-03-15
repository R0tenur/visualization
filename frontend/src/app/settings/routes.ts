import { Routes } from '@angular/router';
import { BuilderComponent } from '../components/builder/builder.component';
import { MermaidViewerComponent } from '../components/mermaid-viewer/mermaid-viewer.component';

export const routes: Routes = [
  { path: '', component: MermaidViewerComponent },
  { path: 'builder', component:  BuilderComponent }
];
