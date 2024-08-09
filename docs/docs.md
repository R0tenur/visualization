# Generating vsix File / Extension For Azure Data Studio

This page is for developers that want to use a local version of this repository to create a vsix file that can be installed as an extension in Azure Data Studio and used to create Entity Relationship Diagrams.

## Prerequisites For Generating vsix File
- Windows 11 Home, Version 22H2, OS build 22621.3880, Windows Feature Experience Pack 1000.22700.1020.0
- Install `nvm` and Node.js version 20.16.0 per https://github.com/tslever/React/blob/main/How_To_Set_Up_NVM_On_Windows.txt .
- Install yarn per `npm install -g yarn`.

## Install This Node.js Project

In Git Bash, ensure you are using Node.js version 20.16.0 by running `node --version`.
Navigate to the root of this repository.
Run `cd backend`.
Run `npm i`.
Run `mkdir out`.
Run `cd ../frontend`.
Run `npm i`.

## Compile 

Run `cd ../frontend`.
Run `npm run build`.
Run `cd ../backend`.
Run `npm run compile`.

## Pack

Run `cd ../backend`.
Run `npm run pack`.

# Install vsix File In Azure Data Studio

Install Azure Data Studio for User version 1.49.0.
Open Azure Data Studio.
Open Extensions.
Click the ellipsis and Install from VSIX...
Install file Generator_Of_ERDs/backend/schema-visualization-0.9.3.vsix.
On the Welcome screen click "Create a connection".
Connect to a database server.
Right click the database server and click Manage.
Click Schema Visualization. 