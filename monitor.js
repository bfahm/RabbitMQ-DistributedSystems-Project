const amqp = require("amqplib");
const rabbittAddress = "amqp://guest:guest@192.168.43.99:5672";
const rabbittAddressLocal = "amqp://localhost:5672";

var consumersLastUpdate = new Array(0, 0, 0);

connect(); // run the bellow function

async function connect(){
    try{
        
        // Connect and create a channel
        const connection = await amqp.connect(rabbittAddress);
        const channel = await connection.createChannel();
        
        //----------------------------------------------------------------------------------------------
        // Wait for a RPC to state the current status (calculates how long have been consumers offline)
        await channel.assertQueue("STATUS");

        channel.consume("STATUS", message=>{
            channel.ack(message);
            channel.sendToQueue("STATUS", Buffer.from(JSON.stringify({response: checkStatus()})));
        });

        //----------------------------------------------------------------------------------------------
        // Monitor Consumer 1 on its queue and save last time it was seen online
        await channel.assertQueue("CONSUMER_1_MONITOR");

        channel.consume("CONSUMER_1_MONITOR", message=>{
            const input = JSON.parse(message.content.toString());
            consumersLastUpdate[0] = input.time;
            channel.ack(message);
        });

        //----------------------------------------------------------------------------------------------
        // Monitor Consumer 2 on its queue and save last time it was seen online
        await channel.assertQueue("CONSUMER_2_MONITOR");

        channel.consume("CONSUMER_2_MONITOR", message=>{
            const input = JSON.parse(message.content.toString());
            consumersLastUpdate[1] = input.time;
            channel.ack(message);
        });

        //----------------------------------------------------------------------------------------------
        // Monitor Consumer 3 on its queue and save last time it was seen online
        await channel.assertQueue("CONSUMER_3_MONITOR");

        channel.consume("CONSUMER_3_MONITOR", message=>{
            const input = JSON.parse(message.content.toString());
            consumersLastUpdate[2] = input.time;
            channel.ack(message);
        });
        

    }catch(ex){
        console.error(ex);
    }
}

function checkStatus(){

    // Get current date 
    var today = new Date();
    var time = today.getHours() * 60 * 60 + today.getMinutes() * 60 + today.getSeconds();

    // Calculate last seen
    var result = new Array();

    var arrayLength = consumersLastUpdate.length;
    for (var i = 0; i < arrayLength; i++) {
        result[i] = time - consumersLastUpdate[i];
    }

    return result;
}