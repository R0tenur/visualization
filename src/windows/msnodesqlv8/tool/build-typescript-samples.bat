@echo off
echo Building TypeScript samples
cd samples\typescript

CALL npm install
CALL npm run tsc

cd ..\..\
