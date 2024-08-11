# Generating vsix File / Extension For Azure Data Studio

This page is for developers that want to use a local version of this repository to create a vsix file that can be installed as an extension in Azure Data Studio and used to create Entity Relationship Diagrams.

## Notes

- You might consider generating a vsix file on an operating system like Ubuntu 22.04.3 LTS (GNU/Linux 5.15.153.1-microsoft-standard-WSL2 x86_64) or Windows 11 Home, Version 22H2, OS build 22621.3880, Windows Feature Experience Pack 1000.22700.1020.0.

## Prerequisites For Generating vsix File

- A recent version of node.js. You might consider installing `nvm` and Node.js version 20.16.0 per [How To Set Up NVM](https://github.com/tslever/React/blob/main/How_To_Set_Up_NVM.md).
- yarn, or npm and yarn. You might consider installing yarn by running `npm install --global yarn`.

To be able to use a debugger:
- vscode - for the development
- [Azure Data Studio Debug](https://marketplace.visualstudio.com/items?itemName=ms-mssql.sqlops-debug) extension

## Installing This Node.js Project

### yarn

Backend
```sh
cd backend && yarn && mkdir out
```

Frontend
```sh
cd frontend && yarn
```

### npm

Ensure you are using your installed version of Node.js (e.g., 20.16.0) by running `node --version`.

Navigate to the root of this repository.

Run `cd backend`.

Run `npm i`.

Run `mkdir out`.

Run `cd ../frontend`.

Run `npm i`.

## Compile 

### yarn

```sh
cd frontend && yarn run build && cd ../backend && yarn run compile
```

### npm

Run `cd ../frontend`.

Run `npm run build`.

Run `cd ../backend`.

Run `npm run compile`.

## Pack

### yarn

```sh
cd backend && yarn run
```

### npm

Run `cd ../backend`.

Run `npm run pack`.

Move `<ROOT OF THIS REPOSITORY>/backend/schema-visualization-<MAJOR VERSION NUMBER>.<MINOR VERSION NUMBER>.<PATCH NUMBER>.vsix` to a desired location for installation as an extension in Azure Data Studio.

## Install vsix File In Azure Data Studio

Install Azure Data Studio (e.g., Azure Data Studio for User version 1.49.0).

Open Azure Data Studio.

Open Extensions.

Click the ellipsis and Install from VSIX...

Install the above vsix file.

On the Welcome screen click "Create a connection".

Connect to a database server.

Right click the database server and click Manage.

Click Schema Visualization.

## Debug

By using vscode as editor with the extension [Azure Data Studio Debug](https://marketplace.visualstudio.com/items?itemName=ms-mssql.sqlops-debug) you are able to set breakpoints in the backend code. Start in debug mode by pressing f5.

## Frontend

The frontend is based on Angular and can be runned without the backend in the browser by:

```sh
cd frontend && yarn start
```

Then it's possible to run a mocked environment in the browser at `localhost:4200`
