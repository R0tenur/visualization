# Schema Visualization

This page is for developers that want to run the project locally.

## Prerequisites
- A recent version of node.js
- yarn or npm

To be able to use a debugger:
- vscode - for the development
- [Azure Data Studio Debug](https://marketplace.visualstudio.com/items?itemName=ms-mssql.sqlops-debug) extension

## Installation
In a terminal:

### Yarn:

Backend
```sh
cd backend && yarn && mkdir out
```

Frontend
```sh
cd frontend && yarn
```

### Npm

Backend
```sh
cd backend && npm i && mkdir out
```

Frontend
```sh
cd frontend && npm i
```

## Compile and pack
### Yarn
Compile:
 ```sh
    cd frontend && yarn run build && cd ../backend && yarn run compile
 ```
Pack:
  ```sh
    cd backend && yarn run
 ```

### Npm
Compile:
 ```sh
    cd frontend && npm run build && cd ../backend && npm run compile
 ```
Pack:
  ```sh
    cd backend && npm run pack
 ```


This will generate an vsix that can be installed in azure data studio.

## Debug
By using vscode as editor with the extension [Azure Data Studio Debug](https://marketplace.visualstudio.com/items?itemName=ms-mssql.sqlops-debug) you are able to set breakpoints in the backend code. Start in debug mode by pressing f5.

## Frontend
The frontend is based on Angular and can be runned without the backend in the browser by:

```sh
cd frontend && yarn start
```
Then it's possible to run a mocked environment in the browser at `localhost:4200`