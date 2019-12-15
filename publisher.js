// Currently on publisher client that will send tasks to the broker,
// need to connect to the RABBIT server..

const amqp = require("amqplib");
const rabbittAddress = "amqp://guest:guest@192.168.43.99:5672";
const rabbittAddressLocal = "amqp://localhost:5672";


connect();

async function connect() {
    try {

        // Connect and create a channel
        const connection = await amqp.connect(rabbittAddressLocal);
        const channel = await connection.createChannel();

        //----------------------------------------------------------------------------------------------
        // Request RPC to know status of each consumer
        await channel.assertQueue("STATUS");
        channel.sendToQueue("STATUS", Buffer.from(JSON.stringify({ action: "GET_STATUS" })));

        channel.consume("STATUS", message => {
            channel.ack(message);
            const input = JSON.parse(message.content.toString());
            handleStatusResult(input.response);
        });


    } catch (ex) {
        console.error(ex);
    }
}

async function assignToConsumer(consumerName, firstDate, lastDate) {
    try {

        // Connect and create a channel
        const connection = await amqp.connect(rabbittAddressLocal);
        const channel = await connection.createChannel();
        queueName = consumerName;

        //----------------------------------------------------------------------------------------------
        // Request RPC to get result from each consumer
        
        await channel.assertExchange('logs', 'fanout', {
            durable: false
        });

        const msg = JSON.stringify({ consumerName: consumerName, firstDate: firstDate, lastDate: lastDate });
        const exchangeName = 'MAIN_EXCHANGE';

        await channel.publish(exchangeName, consumerName, Buffer.from(msg));

        console.log(" [x] Sent %s", msg);

        setTimeout(function() { 
            connection.close(); 
            process.exit(0); 
          }, 500);

    } catch (ex) {
        console.error(ex);
    }
}



function handleStatusResult(results) {

    var activeConsumers = new Array();
    var arrayLength = results.length;

    if (arrayLength == 0) {
        console.log("No active consumers");
    }

    for (var i = 0; i < arrayLength; i++) {
        if (results[i] > 1) {
            console.log("Consumer " + (i + 1) + " has been offline since " + results[i] + " seconds");
        } else {
            console.log("Consumer " + (i + 1) + " is online.");
            activeConsumers.push("CONSUMER" + (i + 1));
        }
    }
    distributeWork(activeConsumers);
}

function distributeWork(arrayOfActiveConsumers){
    const firstYear = parseInt(process.argv.slice(2)[0]);
    const lastYear = parseInt(process.argv.slice(2)[1]);
    var arrayOfYears = new Array();

    const numberOfActiveConsumers = arrayOfActiveConsumers.length;
    
    for(var i = firstYear; i<=lastYear; i++){
        arrayOfYears.push(i);
    }

    const chunkifyResult = chunkify(arrayOfYears, numberOfActiveConsumers, true);
    console.log("Years will be distributes as follows:");
    console.log(chunkifyResult);

    for(var i = 0; i< numberOfActiveConsumers; i++){
        const lenghtOfCurrentChunck = chunkifyResult[i].length;
        assignToConsumer("CONSUMER"+(i+1), chunkifyResult[i][0], chunkifyResult[i][lenghtOfCurrentChunck-1]);
    }
}

function chunkify(a, n, balanced) {
    if (n < 2)
        return [a];
    var len = a.length,
            out = [],
            i = 0,
            size;
    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    }
    else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }
    else {
        n--;
        size = Math.floor(len / n);
        if (len % size === 0)
            size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));
    }
    return out;
}