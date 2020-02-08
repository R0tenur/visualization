const http = require('http')
const hostname = 'localhost'
const port = 2020
const sql = require('msnodesqlv8')

const connectionString = 'driver={SQL Server Native Client 11.0};server=(localdb)\\node;trusted_connection=yes;database=scratch;'
const query = 'select top 50 object_name(c.object_id), (select dc.definition from sys.default_constraints as dc where dc.object_id = c.default_object_id) as DefaultValueExpression from sys.columns as c'

function toPromise (f) {
  return function (args) {
    return new Promise((resolve, reject) => {
      function handler (err, res) {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      }

      if (args) {
        f(args, handler)
      } else {
        f(handler)
      }
    })
  }
}

async function test (request, response) {
  response.statusCode = 200
  response.setHeader('Content-Type', 'text/plain')

  console.log('>> test')
  const sqlOpen = toPromise(sql.open)
  try {
    console.log('sqlOpen ....')
    const connection = await sqlOpen(connectionString)
    console.log('..... sqlOpen')
    const connectionQuery = toPromise(connection.queryRaw)
    try {
      const d = new Date()
      console.log('connectionQuery 1 ....')
      const data = await connectionQuery(query)
      console.log('... connectionQuery 1')
      const elapsed = new Date() - d
      console.log(`rows.length ${data.rows.length} elapsed ${elapsed}`)
      response.end(JSON.stringify(data, null, 4))
      const close = toPromise(sql.close)
      console.log('close ...')
      await close()
      console.log('... close')
      console.log('<< test')
    } catch (err) {
      response.end(err.message)
    }
  } catch (err) {
    response.end(err.message)
  }
}

const httpServer = http.createServer(function (request, response) {
  test(request, response)
})
httpServer.listen(port, hostname, function () {
  console.log(`Server running at http://${hostname}:${port}/`)
})
