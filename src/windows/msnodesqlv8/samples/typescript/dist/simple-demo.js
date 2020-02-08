"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require("msnodesqlv8");
const connectionString = "server=.;Database=Master;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const query = "SELECT name FROM sys.databases";
sql.query(connectionString, query, (err, rows) => {
    console.log(rows);
});
//# sourceMappingURL=simple-demo.js.map