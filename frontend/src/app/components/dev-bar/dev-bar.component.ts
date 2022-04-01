import { Component } from '@angular/core';
import { Status } from '../../../../../shared/models/status.enum';
import { DataStudioService } from '../../services/data-studio.service';
import { FakeDbService } from '../../services/fake-db.service';

@Component({
  selector: 'app-dev-bar',
  templateUrl: './dev-bar.component.html',
})
export class DevBarComponent {
  public numberOfTables = 10;
  constructor(public readonly azData: DataStudioService, private readonly fakeDb: FakeDbService) { }


  public async triggerFakeEvent(): Promise<void> {
    const chart = this.fakeDb.createDiagram(this.numberOfTables);
    const gettingDataEvent = new CustomEvent('message') as any;
    gettingDataEvent.data = {
      status: Status.GettingTableData,
    };
    window.dispatchEvent(gettingDataEvent);
    await this.delay(500);

    const buildingEvent = new CustomEvent('message') as any;
    buildingEvent.data = {
      status: Status.BuildingChart,
    };
    window.dispatchEvent(buildingEvent);
    await this.delay(500);

    const event = new CustomEvent('message') as any;
    event.data = {
      status: Status.Complete,
      databaseName: 'Northwind',
      chart,
    };

    window.dispatchEvent(event);
  }

  private delay(milliSeconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliSeconds));
  }
}
