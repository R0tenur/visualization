import { ITable, IColumn, TableCoordinates, Relation } from "./models/table.model";
import { columnOffsets, tableHeight } from "./settings/offsets";
import constants from "./settings/constants";

export const getRelations = (tables: ITable[]): Relation[] => {
    const relations: Relation[] = [];
    tables.forEach((fromTable: ITable, index) => {
        fromTable.columns.filter(c => c.reference).forEach(fromColumn => {
            const indexOfColumn = fromTable.columns.indexOf(fromColumn);
            fromTable.columns.forEach((c, i) => { c.position = columnOffsets(fromTable.position as TableCoordinates, i); });
            const referenceTable = tables.find(z => z.name === fromColumn.reference.table) as ITable;
            const toColumn = referenceTable.columns.find(z => fromColumn.reference.column === z.name) as IColumn;

            const fromTableTop = fromTable.position as TableCoordinates;
            const toTableTop = referenceTable.position as TableCoordinates;
            const from = fromColumn.position as TableCoordinates;
            const to = toColumn.position as TableCoordinates;

            const fromTableBottom = {
                x: fromTableTop.x,
                y: fromTableTop.y - tableHeight(fromTable)
            };


            const toTableBottom = {
                x: toTableTop.x,
                y: toTableTop.y + tableHeight(referenceTable)
            };

            const topMargin = - constants.margin / 2 + index * 0.01 + (indexOfColumn + index) * 1.9;
            const bottomMargin = constants.margin / 2 + index * 0.01 + (indexOfColumn + index) * 1.9;


            let custom = [
                {
                    x: fromTableTop.x + topMargin,
                    y: toTableTop.y + topMargin
                },
                {
                    x: toTableTop.x + topMargin,
                    y: toTableTop.y + topMargin
                },
            ];

            if (from.x > to.x && (from.y > toTableBottom.y || from.y < toTableTop.y)) {
                custom = [
                    {
                        x: to.x + topMargin,
                        y: from.y
                    },
                ];
            }

            if (from.x < to.x && !(fromTableTop.y < to.y && fromTableBottom.y < to.y)) {
                custom = [
                    {
                        x: from.x + topMargin,
                        y: to.y
                    },
                ];
            }

            const via: TableCoordinates[] = [
                {
                    x: from.x + topMargin,
                    y: from.y,
                },
                ...custom,
                {
                    x: to.x - constants.margin / 2 + index * 0.01 + (indexOfColumn + index) * 1.9,
                    y: to.y,
                },
            ];
            relations.push({
                from: from,
                to: to,
                via: via
            });
        })
    });

    return relations;
};