import constants from "./constants";
import { ITable, TableCoordinates } from "../models/table.model";

export const tableOffsets = (index: number): TableCoordinates => {
    return {
        x: (index % (constants.tablesOnRow)) * constants.tableWidth + (index % (constants.tablesOnRow)) * constants.margin + constants.margin,
        y: constants.margin + (index - (index % (constants.tablesOnRow))) * 40
    };
};

export const columnOffsets = (tableOffset: TableCoordinates, index: number): TableCoordinates => {
    return {
        x: tableOffset.x,
        y: tableOffset.y + constants.padding * (index - 1) + constants.fontSize + constants.headerHeight
    };
}; 

export const tableHeight = (table: ITable) => constants.headerHeight + constants.padding * table.columns.length;
