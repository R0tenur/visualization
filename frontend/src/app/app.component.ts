import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DataStudioService } from './services/data-studio.service';
import { Exportable } from './models/exportable.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  public get Database$(): Observable<Exportable> {
    return this.dataStudioService.Database$;
  }
  constructor(public readonly dataStudioService: DataStudioService) {}

  public exportSvg(svg: string, markdown: string): void {
    this.dataStudioService.saveCommand({ chart: svg, mermaid: markdown });
  }
}
