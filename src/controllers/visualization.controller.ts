import { dashboard, DashboardWebview } from "azdata";
import { loadWebView } from "../web.loader";
import { visualizationPanelName } from "../constants";
import { getMssqlDbSchema } from "../repositories/mssql.repository";
import { chartBuilder } from "../services/builder.service";
import { Status } from "../models/status.enum";
import { Database } from "../models/database.model";

export const VisualizationController = () => {
    let counterHtml = loadWebView();

    dashboard.registerWebviewProvider(
        visualizationPanelName,
        async (webview: DashboardWebview) => {
            webview.html = counterHtml;
            if (webview.connection.options.database) {
                webview.postMessage({
                    status: Status.GettingTableData,
                });
                const database = await getMssqlDbSchema(
                    webview.connection.options.user,
                    webview.connection.options.password,
                    webview.connection.options.server,
                    webview.connection.options.database,
                    webview.connection.options.authenticationType === 'Integrated'
                );
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
            errors: database.errors
        });
    } else {
        webview.postMessage({
            status: Status.Error,
            errors: ['Could not build chart from the recived data'],
            databaseRaw: database.tables
        });
    }
};