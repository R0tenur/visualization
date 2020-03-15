import React from 'react';

export default () => 
{
    return (
        <filter id="shadow" x="0" y="0" width="200%" height="200%">
            <feOffset result="offOut" in="SourceGraphic" dx="20" dy="20" />
            <feColorMatrix result="matrixOut" in="offOut" type="matrix"
                values="0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0" />
            <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="10" />
            <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
        </filter>
    );
};