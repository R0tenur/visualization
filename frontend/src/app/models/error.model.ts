import { Status } from '../../../../shared/models/status.enum';

export interface ChartError {
  status: Status;
  errors: string[];
  rawData: string;
}
