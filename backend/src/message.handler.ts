import { window } from "vscode";
import { exportService } from "./services/export.service";

export const messageHandler = async (e: any) => {
    const selectable = !e.data.chart ? ['md'] : ['svg', 'md'];
    await new Promise(resolve => setTimeout(resolve, 100));
    const selected = await window.showQuickPick([...selectable]);
    let data = e.data;
    await exportService(`chart.${selected}`, data, selected);
};
