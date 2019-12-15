const r = require("rethinkdb");
// localhost = ip of master
async function handleCountRequest(period, callback) {
  r.connect({ host: "192.168.43.222", port: 28015 }, function(err, conn) {
    r.db("nobel")
      .table("prize")
      .filter(
        r
          .row("year")
          .ge(period[0]) // greater that or equal
          .and(r.row("year").le(period[1])) // less than or equal
      )
      .count()
      .run(conn, function(err, result) {
        if (err) throw err;
        callback(result);
        console.log(result);
      });
  });
}

module.exports.handleCountRequest = handleCountRequest;
