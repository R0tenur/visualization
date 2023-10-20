import { DashboardWebview } from "azdata";
import { Status } from "./models/status.enum";
import { Database } from "./models/database.model";

export const showError = (webview: DashboardWebview, error: Error) =>
  webview.postMessage({
    status: Status.Error,
    errors: [error.message],
    rawData: error.stack,
  });

export const showStatus = (webview: DashboardWebview, status: string) =>
  webview.postMessage({
    status,
  });
export const showResult = (
  webview: DashboardWebview,
  chart: string,
  database: Database
) => {
  if (chart) {
    webview.postMessage({
      status: Status.Complete,
      databaseName: webview.connection.options.database,
      chart,
      errors: database.errors,
      tables: database.tables,
    });
  } else {
    webview.postMessage({
      status: Status.Error,
      errors: database.errors,
      databaseRaw: database.tables,
    });
  }
};
