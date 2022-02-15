import { window } from "vscode";
import { dashboard, DashboardWebview } from "azdata";
import { loadWebView } from "../web.loader";
import { visualizationPanelName } from "../constants";
import { getMssqlDbSchema } from "../repositories/mssql.repository";
import { chartBuilder } from "../services/builder.service";
import { Database } from "../models/database.model";
import { Status } from "../models/status.enum";
import { exportService } from "../services/export.service";

export const VisualizationController = () => {
    let counterHtml = loadWebView();

    dashboard.registerWebviewProvider(
        visualizationPanelName,
        async (webview: DashboardWebview) => {
            webview.html = counterHtml;
            webview.onMessage(e => recivedMessage(e));

            if (webview.connection.options.database) {
                await getMermaidForDb(webview);
            } else {
                webview.postMessage({
                    status: Status.NoDatabase,
                });
            }
        }
    );
};

const getMermaidForDb = async (webview: DashboardWebview) => {
    webview.postMessage({
        status: Status.GettingTableData,
    });
    try {
        const database = await getMssqlDbSchema(
            webview.connection.connectionId,
            webview.connection.options.database);
        webview.postMessage({
            status: Status.BuildingChart,
            databaseRaw: database.tables
        });
        const chart = chartBuilder(database.tables);

        showResult(webview, chart, database);
    } catch (error) {
        showError(webview, error);
    }
};

const showResult = (webview: DashboardWebview, chart: string, database: Database) => {
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
            databaseRaw: database.tables
        });
    }
};
const showError = (webview: DashboardWebview, error: Error) => webview.postMessage({
    status: Status.Error,
    errors: [error.message],
    rawData: error.stack
});
const recivedMessage = async (e: any) => {
    const selected = await window.showQuickPick([...['svg', 'md']]);
    let data = e.data;
    await exportService(`chart.${selected}`, data, selected);
};

