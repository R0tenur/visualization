import React from 'react';
import ColumnKey from './ColumnKey';
import constants from '../../settings/constants';


export default (props: any) => {
  const { column, index } = props;

  return (
    <>
      {column.key ? <ColumnKey offsets={{ x: 5, y: constants.padding * (index - 1) + constants.headerHeight}} /> : ''}
      <text
        x={constants.padding}
        y={constants.padding * index + 50}
        fontSize={constants.fontSize}
        fill={constants.fontColor}
      >
        {column.name} ({column.dataType})
      </text>
    </>
  );
};