import React, { useEffect, useState } from 'react';
import { ITable, TableCoordinates } from '../models/table.model';
import { tableOffsets, columnOffsets } from '../settings/offsets';
import Shadow from './diagram/Shadow';
import Table from './diagram/Table';
import Line from './diagram/Line';
import { getRelations } from '../utils';

export default () => {

    let inputTables: ITable[] = undefined as any as ITable[];
    const [tables, setTables] = useState(inputTables);
    const messageHandler = (e: {
        data: {
            tables: ITable[]
        }
    }) => {
        inputTables = e.data.tables;
    }
    useEffect(() => {
        // initiate the event handler
        window.addEventListener('message', messageHandler, false);

        // this will clean up the event every time the component is re-rendered
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    });
    // const inputTables: ITable[] = [
    //     {
    //         name: 'TableName0',
    //         columns: [{ name: 'Column1', dataType: 'nvarchar', reference: { table: 'TableName1', column: 'Column2' }, key: false }]
    //     },
    //     {
    //         name: 'TableName1',
    //         columns: [{ key: false, name: 'Column1', dataType: 'nvarchar' }, { key: true, name: 'Column2', dataType: 'nvarchar' }]
    //     },
    //     {
    //         name: 'TableName2',
    //         columns: [{ key: true, name: 'Column1', dataType: 'nvarchar', reference: { table: 'TableName1', column: 'Column1' } }, { key: true, name: 'Column2', dataType: 'nvarchar' }]
    //     },
    //     {
    //         name: 'TableName3',
    //         columns: [{ name: 'Column1', dataType: 'nvarchar', reference: { table: 'TableName1', column: 'Column2' }, key: false }]
    //     },
    //     {
    //         name: 'TableName4',
    //         columns: [{ name: 'Column1', dataType: 'nvarchar', reference: { table: 'TableName1', column: 'Column2' }, key: false }]
    //     },
    // ];
    if (inputTables) {
        inputTables.forEach((e: ITable, index) => {
            e.position = tableOffsets(index);
            e.columns.forEach((c, i) => { c.position = columnOffsets(e.position as TableCoordinates, i); });
        });




        let relations = getRelations(tables);

        const tableMoved = (index: number, coordinates: TableCoordinates) => {
            const tempTables = [...tables];
            tempTables[index].position = coordinates;
            tempTables[index].columns.forEach((c, i) => { c.position = columnOffsets(tempTables[index].position as TableCoordinates, i); });
            setTables(tempTables)
            relations = getRelations(tables);
        }
        return (
            <div className="App">
                <svg height="100vh" width="100%">
                    <Shadow />
                    {tables.map((table, key) => <Table table={table} index={key} key={key} tableMoved={(index: number, coordinates: TableCoordinates) => tableMoved(index, coordinates)} />)}
                    {relations.map((relation: any, key: number) => <Line from={relation.from} via={relation.via} to={relation.to} key={key} />)}
                </svg>
            </div>
        );
    }

    return (<div>Laddar</div>)

}