import { Component } from '@angular/core';
import { Status } from '../../../../../shared/models/status.enum';
import { DataStudioService } from '../../services/data-studio.service';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss']
})
export class StatusComponent{
  Status = Status;

  constructor(public readonly dataStudio: DataStudioService) { }

}
