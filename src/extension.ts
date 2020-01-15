import {DashboardWebview, dashboard} from 'azdata';

import { mssqlChartBuilder } from './chart-builders/mssql.builder';
import { getMssqlDbSchema } from './repositories/mssql.repository';
import { loadWebView } from './web.loader';
import { ExtensionContext } from 'vscode';
import { vizualisationPanelName } from './constants';

export const  activate = (context: ExtensionContext) => addVisualisationPanel();

export const addVisualisationPanel = () => {
  let counterHtml = loadWebView();

  dashboard.registerWebviewProvider(
    vizualisationPanelName,
    async (webview: DashboardWebview) => {
      webview.html = counterHtml;
      if (webview.connection.options.database) {
        const tables = await getMssqlDbSchema(
          webview.connection.options.user,
          webview.connection.options.password,
          webview.connection.options.server,
          webview.connection.options.database
        );
        const chart = mssqlChartBuilder(tables);
        webview.postMessage(chart);
      }
    }
  );
};

export const deactivate = () => {};

