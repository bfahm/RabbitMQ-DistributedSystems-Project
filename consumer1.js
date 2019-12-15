const amqp = require("amqplib");
const {handleCountRequest} = require("./handleRequest");
const rabbittAddress = "amqp://guest:guest@192.168.43.99:5672";
const rabbittAddressLocal = "amqp://localhost:5672";

const consumerName = "CONSUMER1";
const consumerId = "1";


connect(); // run the bellow function

async function connect(){
    try{
        
        const connection = await amqp.connect(rabbittAddress);
        console.log("Waiting for messages...");

        const channelJobs = await connection.createChannel();
        const exchangeName = 'MAIN_EXCHANGE';

        await channelJobs.assertExchange(exchangeName, 'fanout', {
            durable: false
        });

        
        await channelJobs.assertQueue(consumerName);

        await channelJobs.bindQueue(consumerName, exchangeName, '');

        channelJobs.consume(consumerName, message=>{

            const input = JSON.parse(message.content.toString())
            
            if(input.consumerName == consumerName){
                console.log(`Recieved job with start date ${input.firstDate} and end date ${input.lastDate}`); 
                channelJobs.ack(message);

                handleCountRequest([input.firstDate, input.lastDate], result => {
                    console.log(result);
                    channelJobs.assertQueue("CONSUMER_1_RESULT");
                    channelJobs.sendToQueue("CONSUMER_1_RESULT", Buffer.from(JSON.stringify({result: result})));
                });
                
                
            }
            
        });

        //---------------------------------------------------------------------------------------------

        const channelMonitor = await connection.createChannel();
        await channelMonitor.assertQueue("CONSUMER_1_MONITOR");

        var check = function(){

            channelMonitor.sendToQueue("CONSUMER_1_MONITOR", Buffer.from(JSON.stringify(update())));
            process.stdout.write(update());
            
            setTimeout(check, 1000);
        }
        check();



    }catch(ex){
        console.error(ex);
    }
}


function update(){
    var today = new Date();
    var time = today.getHours() *60*60 + today.getMinutes()*60 + today.getSeconds();

    return {ID: consumerId, time: time}
}

function rethink(firstDate, lastDate){
    const r = require('rethinkdb');

    var connection = null;
    r.connect( {host: '192.168.43.222', port: 28015}, function(err, conn) {
        if (err) throw err;
        connection = conn;

        r.db('nobel').table('prize').count().run(connection, function(err, cursor) {
            if (err) throw err;
            console.log(cursor);
        });

        
        // r.db('nobel').table('prize').run(connection, function(err, cursor) {
        //     if (err) throw err;
        //     cursor.toArray(function(err, result) {
        //         if (err) throw err;
        //         console.log(JSON.stringify(result, null, 2));
        //     });
        // });
    });
    
}