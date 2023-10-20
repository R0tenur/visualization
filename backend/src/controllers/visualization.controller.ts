/* istanbul ignore file */
import { dashboard, DashboardWebview } from "azdata";
import { loadWebView } from "../web.loader";
import { visualizationPanelName } from "../constants";
import { Status } from "../models/status.enum";
import { getMermaidForDb, messageHandler } from "../message.handler";

let view: DashboardWebview;
export const VisualizationController = () => {
  let counterHtml = loadWebView();

  dashboard.registerWebviewProvider(
    visualizationPanelName,
    async (webview: DashboardWebview) => {
      view = webview;
      view.html = counterHtml;
      view.onMessage((m) => messageHandler(view, m));

      if (view.connection.options.database) {
        await getMermaidForDb(view, {
          options: { showTables: true, showViews: true },
        });
      } else {
        view.postMessage({
          status: Status.NoDatabase,
        });
      }
    }
  );
};
