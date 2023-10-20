import { window } from "vscode";
import { exportService } from "./services/export.service";
import { DashboardWebview } from "azdata";
import { Status } from "./models/status.enum";
import { getMssqlDbSchema } from "./repositories/mssql.repository";
import { chartBuilder } from "./services/builder.service";
import { showError, showResult, showStatus } from "./message.function";

export const messageHandler = async (view: DashboardWebview, e: any) => {
  const handlers = {
    save: saveHandler,
    load: getMermaidForDb,
  };
  const handler = handlers[e.command];

  if (handler) {
    await handler(view, e);
  }
};

export const getMermaidForDb = async (
  webview: DashboardWebview,
  message: any
) => {
  showStatus(webview, Status.GettingTableData);

  try {
    const database = await getMssqlDbSchema(
      webview.connection.connectionId,
      webview.connection.options.database,
      message.options
    );
    webview.postMessage({
      status: Status.BuildingChart,
      databaseRaw: database.tables,
    });
    const chart = chartBuilder(database.tables);

    showResult(webview, chart, database);
  } catch (error) {
    showError(webview, error);
  }
};

const saveHandler = async (_: DashboardWebview, e: any) => {
  const selectable = !e.data.chart ? ["md"] : ["svg", "md"];
  await new Promise((resolve) => setTimeout(resolve, 100));
  const selected = await window.showQuickPick([...selectable]);
  let data = e.data;
  await exportService(`chart.${selected}`, data, selected);
};
