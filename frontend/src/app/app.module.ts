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
import { ChangeModalComponent } from './components/change-modal/change-modal.component';
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
    ChangeModalComponent,
    RelationComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forRoot(routes),
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

