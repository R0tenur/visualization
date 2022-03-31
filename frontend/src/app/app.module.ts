import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MermaidViewerComponent } from './components/mermaid-viewer/mermaid-viewer.component';
import { ButtonComponent } from './components/button/button.component';
import { AlertComponent } from './components/alert/alert.component';
import { StatusComponent } from './components/status/status.component';
import { DevBarComponent } from './components/dev-bar/dev-bar.component';
import { BarComponent } from './components/bar/bar.component';

import { RouterModule } from '@angular/router';
import { routes } from './settings/routes';
import { BuilderComponent } from './components/builder/builder.component';
import { ChartComponent } from './components/chart/chart.component';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { RenameModalComponent } from './components/rename-modal/rename-modal.component';
import { RelationComponent } from './components/relation/relation.component';

@NgModule({
  declarations: [
    AppComponent,
    MermaidViewerComponent,
    ButtonComponent,
    AlertComponent,
    StatusComponent,
    DevBarComponent,
    BarComponent,
    BuilderComponent,
    ChartComponent,
    ContextMenuComponent,
    RenameModalComponent,
    RelationComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
