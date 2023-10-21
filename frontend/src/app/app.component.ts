import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DataStudioService } from './services/data-studio.service';
import { Exportable } from './models/exportable.model';
import { ViewOptions } from '@shared/models/options.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  public options: ViewOptions = {
    showViews: false,
    showTables: true,
  };
  public get Database$(): Observable<Exportable> {
    return this.dataStudioService.Database$;
  }
  constructor(public readonly dataStudioService: DataStudioService) {}

  public exportSvg(svg: string, markdown: string): void {
    this.dataStudioService.saveCommand({ chart: svg, mermaid: markdown });
  }

  public toggleViews() {
    this.options.showViews = !this.options.showViews;
    this.reload();
  }
  private reload() {
    this.dataStudioService.loadCommand(this.options);
  }
}
