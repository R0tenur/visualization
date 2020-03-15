import React, { useState, useRef } from 'react';
import TableHeader from './TableHeader';
import Column from './Column';
import constants from '../../settings/constants';
import { tableHeight } from '../../settings/offsets';
export default (props: any) => {
  const { table, index, tableMoved } = props;

  const [position, setPosition] = useState({
    x: table.position.x,
    y: table.position.y,
    coords: {},
  });

  const handleMouseMove = useRef((e: any) => {
    setPosition((position: any) => {
      const xDiff = position.coords.x - e.pageX;
      const yDiff = position.coords.y - e.pageY;
      tableMoved(index, {
        x: position.x - xDiff,
        y: position.y - yDiff,
      });
      return {
        x: position.x - xDiff,
        y: position.y - yDiff,
        coords: {
          x: e.pageX,
          y: e.pageY,
        },
      };
    });
  });

  const handleMouseDown = (e: any) => {
    const pageX = e.pageX;
    const pageY = e.pageY;
    setPosition(position => Object.assign({}, position, {
      coords: {
        x: pageX,
        y: pageY,
      },
    }));
    document.addEventListener('mousemove', handleMouseMove.current);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove.current);
    setPosition(position =>
      Object.assign({}, position, {
        coords: {},
      })
    );
  };
  return (
    <svg x={position.x} y={position.y} onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}>
      <rect  width={constants.tableWidth} height={tableHeight(table)} fill={constants.backgroundColor}>
      </rect>
      <TableHeader title={table.name} />
      {table.columns.map((column: any, key: number) => <Column column={column} index={key} key={key}/>)}
    </svg>
  );
};

