import { ITable, TableCoordinates } from './models/table.model';
import { getRelations } from './utils';
describe('getRelations', () => {

    let inputTables: ITable[]; 
    const magicalOffsetNumber = 47;
    
    beforeEach(() => {
        inputTables = [
            {
                name: 'TableName0',
                columns: [{
                    name: 'Column1',
                    dataType: 'nvarchar',
                    key: true,
                    reference: {
                        table: 'TableName1',
                        column: 'Column1'
                    },
                }]
            },
            {
                name: 'TableName1',
                columns: [{
                    key: false,
                    name: 'Column1',
                    dataType: 'nvarchar',
                }],
            },
        ];

    })

    test('should always connect points', () => {
        setFirstTablePosition({ x: 500, y: 500 });
        setSecondTablePosition({x: 500, y: 500});

        const relation = getRelations(inputTables)[0];

        expect(relation.to).toEqual({ x: 500, y: 500 + magicalOffsetNumber });
        expect(relation.from).toEqual({ x: 500, y: 500 + magicalOffsetNumber });
    });


    const setFirstTablePosition = (position: TableCoordinates) => {
        inputTables[0].position = position;
        inputTables[0].columns[0].position = position;
    }

    const setSecondTablePosition = (position: TableCoordinates) => {
        inputTables[1].position = position;
        inputTables[1].columns[0].position = position;
        inputTables[1].columns[0].position.y += magicalOffsetNumber;

    }
});

