import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MermaidViewerComponent } from './components/mermaid-viewer/mermaid-viewer.component';
import { ButtonComponent } from './components/button/button.component';
import { AlertComponent } from './components/alert/alert.component';
import { StatusComponent } from './components/status/status.component';
import { DevBarComponent } from './components/dev-bar/dev-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    MermaidViewerComponent,
    ButtonComponent,
    AlertComponent,
    StatusComponent,
    DevBarComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
