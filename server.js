const express = require('express')
const bodyParser = require('body-parser');
var request = require('request');
const line = require('@line/bot-sdk')
const restClient = new (require('node-rest-client').Client)
const excelToJson = require('convert-excel-to-json')
const geolib = require('geolib')

const peavolta = excelToJson({
  sourceFile: 'Book1.xlsx',
  columnToKey: {
      '*': '{{columnHeader}}'
  },
  range: 'A2:L848'
})

require('dotenv').config()
const app = express()

const config = {
  channelAccessToken: process.env.channelAccessToken,
  channelSecret: process.env.channelSecret
}

app.use(express.static('public'));

const client = new line.Client(config)

app.get('/', function (req, res) {
	res.send('PEA Volta Location')
})

app.post('/webhook', line.middleware(config), (req, res) => {

    if(req.body.events[0].type === 'message' && req.body.events[0].message.type === 'text'){

        postToDialogflow(req);
    
      }

     else if (req.body.events[0].type === 'message' && req.body.events[0].message.type === 'location'){ 

  Promise
    //.all(req.body.events.map(handleEvent))
    .all(req.body.events.map(handleLocationEvent))
    .then((result) => res.json(result))
    .catch(err => console.log('err', err))

     }

});

function handleLocationEvent(event) {

  return new Promise((resolve, reject) => {

      var userlat = parseFloat(event.message.latitude)
      var userlng = parseFloat(event.message.longitude)
      const voltajson = peavolta.Sheet1
      // for loop to calculate distance for all station
      for(var i = 0; i < voltajson.length; i++) {
        var obj = voltajson[i];
        var placelat = obj.lat
        var placelng = obj.lng
        // get distance 
        var distacne = geolib.getDistance(
          { latitude: userlat, longitude: userlng },
          { latitude: placelat, longitude: placelng }
        )
        voltajson[i].distacne = Math.ceil((distacne/1000) * 10) / 10 // write distance to voltajson
      } // end for loop
      // sort object in json array by distance
      voltajson.sort(function(a, b){
        return a.distacne - b.distacne;
      })
      var result = []
      // collect only first 5 elements
      for (var i = 0; i < 5; i++) {
          result.push(voltajson[i])
      }

      if (result) {
        const pinData = result.map(row => ({
          "thumbnailImageUrl": "https://s3.amazonaws.com/images.seroundtable.com/t-google-maps-icon-1580992464.png",
          "imageBackgroundColor": "#FFFFFF",
          "title": `${row.name}`,
          "text": `${row.name}`,
          "actions": [
            {
              "type": "uri",
              "label": `${row.name} km, กดเพื่อนำทาง`,
	      "uri": `https://www.google.com/maps/dir/${event.message.latitude},${event.message.longitude}/${row.lat},${row.lng}`
            }
          ]
        }))
        var msg = {
          "type": "template",
                "altText": "ข้อมูลสถานที่",
                "template": {
                  "type": "carousel",
                  "columns": pinData,
                  "imageAspectRatio": "rectangle",
                  "imageSize": "cover"
                }
              }
        resolve(client.replyMessage(event.replyToken, msg))
      } else {
        var msg = {
          "type": "text",
          "text": "> Missing Data <"                                 
        }
        //resolve(client.replyMessage(event.replyToken, msg))
        reject(msg)
      }

    } 
  )
 
}


const postToDialogflow = req => {
    req.headers.host = "bots.dialogflow.com";
    return request({
      method: "POST",
      uri: 'https://bots.dialogflow.com/line/d5e4e13d-c0cc-4c84-8506-c1d21c965b02/webhook',
      headers: req.headers,
      body: JSON.stringify(req.body)
       });
  };


  app.set('port', (process.env.PORT || 4000))
  app.use(bodyParser.urlencoded({extended: false}))
  app.use(bodyParser.json())
  
  app.listen(app.get('port'), function () {
    console.log('run at port', app.get('port'))
  })
