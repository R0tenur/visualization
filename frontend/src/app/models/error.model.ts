import { Status } from '../../../../shared/models/status.enum';

export const ChartErrorKey = 'ChartErrorKey';
export interface ChartError {
  status: Status;
  errors: string[];
  rawData: string;
}
