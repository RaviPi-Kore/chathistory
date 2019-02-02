var jsonexport    = require('jsonexport');
var express       = require('express');
var bodyParser    = require('body-parser');
var app           = express();
var server        = require('http').Server(app);
var _             = require('lodash');
var Promise       = require('bluebird');
var fs            = require('fs');
var request       = Promise.promisify(require('request'));
var timezone      = require("moment-timezone");

//Environment where you want to pull the data.
var environment   = "bots.kore.ai";

// Organisation ID
var orgId         = "";

// Authorization token
var token         = "";

// From date in GMT
var fromDate      = "";

//To date in GMT
var toDate        = "";

// Stream Ids seperated by comma.
var body          = '{"streamIds":[""]}'; //Add BotId

// Admin user ID
var adminUserId   = "";


var accountId ="";


var head = {
    accept: 'application/json',
    'content-type': 'application/json;charset=UTF-8',
    authorization: 'bearer '+token,
    'requester-type': 'admin',
    origin: 'https://bots.kore.ai',
    accountid:accountId
};

app.use(bodyParser.json());


app.get('/chatHistory',function(req,res){
    var options = {
        method: 'POST',
        url: 'https://'+environment+'/api/1.1/organization/'+orgId+'/botChatHistory',
        qs:
            { from: fromDate,
                to: toDate
            },
        headers: head,
        body: body
    };
    

    request(options, function (error, response, body) {
        if(typeof body === "string"){
            body = JSON.parse(body);
        }
        var userIds = _.uniqBy(body.result,'userId');
        var chatHistoryP = Promise.map(userIds, function(user){

            var options1 = { method: 'GET',
                url: 'https://'+environment+'/api/1.1/users/'+adminUserId+'/builder/streams/'+user.streamId+'/kora/logs',
                //url: 'https://'+environment+'/api/1.1/users/u-32234de9-5b5a-5554-a3e3-ba8d51862ff9/builder/streams/'+user.streamId+'/kora/logs',
                qs:
                    { userId: user.userId,
                        from: fromDate,
                        to: toDate
                    },
                headers: head
            };
            return new Promise (function (resolve, reject) {
                request(options1).then(function (res) {
                      var chats = [];
                    var log = JSON.parse(res.body).koralogs;
                    var text;
                    for (var y in log) {
                        if(log[y].components[0]&&log[y].components[0].data&&log[y].components[0].data.text){
                            text = log[y].components[0].data.text;
                        }else{
                            text = undefined;
                        }
                        var msg = text;
                        var obj = {};
                        obj.type  = log[y].type;
                        obj.botId  = log[y].botId;
                        obj.userId  = user.userId;
                        obj.timeStamp  = timezone(log[y].createdOn).utcOffset(330).format('YYYY-MM-DDTHH:mm:ss')+' IST';
                        obj.channel  = log[y].channels[0].type;
                        obj.message  = msg?msg.trim():"";
                        if (text) {
                            chats.push(obj);
                        }
                    }
                    resolve(chats);
                });
            });
        })


        chatHistoryP.then(function(results){
            if (error) {
                res.send(error);
            }

            jsonexport(results,function(err, csv){
                if(err) return console.log(err);
                console.log("Downloading CSV file");

                fs.writeFileSync("report.csv", csv);
                res.download("report.csv");
            });
        })
    });

});

server.listen(5252,function(){
    console.log('server started on port 5252');
});