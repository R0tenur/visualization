const sql = require('msnodesqlv8')

const connectionString = 'Driver={SQL Server Native Client 11.0}; Server=(localdb)\\node; Database={master}; Trusted_Connection=Yes;'
const query = 'SELECT * FROM syscomments'

sql.open(connectionString, function (err, con) {
  if (err) {
    console.log(`failed to open ${err.message}`)
  }
  var d = new Date()
  con.query(query, function (err, rows) {
    if (err) {
      console.log(err.message)
      return
    }
    var elapsed = new Date() - d
    console.log(`rows.length ${rows.length} elapsed ${elapsed}`)
    d = new Date()
    con.query(query, function (err, rows) {
      if (err) {
        console.log(err.message)
        return
      }
      var elapsed = new Date() - d
      console.log(`rows.length ${rows.length} elapsed ${elapsed}`)
    })
  })
})
