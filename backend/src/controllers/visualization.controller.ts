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
                webview.postMessage({
                    status: Status.GettingTableData,
                });
                const database = await getMssqlDbSchema(
                    webview.connection.connectionId,
                    webview.connection.options.database);
                webview.postMessage({
                    status: Status.BuildingChart,
                    errors: database.errors,
                    databaseRaw: database.tables
                });

                const chart = chartBuilder(database.tables);

                showResult(webview, chart, database);

            } else {
                webview.postMessage({
                    status: Status.NoDatabase,
                });
            }
        }
    );
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
            errors: ['Could not build chart from the recived data'],
            databaseRaw: database.tables
        });
    }
};
const recivedMessage = async (e: any) => {
    const selected = await window.showQuickPick([...['svg', 'md']]);
    let data = e.data;
    await exportService(`chart.${selected}`, data, selected);
};

