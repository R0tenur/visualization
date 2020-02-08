const sql = require('msnodesqlv8')

// const connectionString = 'Driver={SQL Server Native Client 11.0}; Server=np:\\\\.\\pipe\\LOCALDB#CE90B02A\\tsql\\query; Database={master}; Trusted_Connection=No;Uid=test;Database=test;Pwd=...'
const connectionString = 'Driver={SQL Server Native Client 11.0}; Server=(localdb)\\node; Database={master}; Trusted_Connection=Yes;'

sql.open(connectionString, function (err, con) {
  if (err) {
    if (Array.isArray(err)) {
      err.forEach((e) => {
        console.log(e.message)
      })
    } else {
      console.log(err.message)
    }
  } else {
    console.log('callback based multiple errors query')
    con.query('select a;select b;', function (err, res, more) {
      if (err) {
        console.log(err.message + 'more = ' + more)
        if (!more) {
          console.log('subscribe to multiple errors query')
          const req = con.query('select a;select b;')
          req.on('error', (msg, more) => {
            console.log('event error ', msg, ' more = ', more)
          })
        }
      } else {
        console.log(res)
      }
    })
  }
})
