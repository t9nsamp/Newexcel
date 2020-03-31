const express = require('express')
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

const client = new line.Client(config)

app.get('/', function (req, res) {
	res.send('03-pm2.5-bot')
})

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch(err => console.log('err', err))
});

function handleEvent(event) {
  if(event.type === 'message' && event.message.type === 'location') {
    return handleLocationEvent(event)
  }else {
    return Promise.resolve(null)
  }
}

function handleLocationEvent(event) {
  return new Promise((resolve, reject) => {
    restClient.get(`${process.env.apiUrl}?lat=${event.message.latitude}&long=${event.message.longitude}`, (data, response) => {
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
             
        
          "type": "bubble",
          "size": "kilo",
          "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "icon",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "text",
                "text": `${row.bank} ${row.name}`,
                "weight": "bold",
                "size": "lg",
                "wrap": true
              },
              {
                "type": "box",
                "layout": "vertical",
                "margin": "lg",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": "เวลาทำการ",
                        "color": "#aaaaaa",
                        "size": "sm",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text": `${row.time}`,
                        "wrap": true,
                        "color": "#666666",
                        "size": "sm",
                        "flex": 5
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "icon",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "text",
                        "text": "ติดต่อ",
                        "color": "#aaaaaa",
                        "size": "sm",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text": `${row.phone}`,
                        "wrap": true,
                        "color": "#666666",
                        "size": "sm",
                        "flex": 5
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "icon",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "text",
                        "text": "ระยะทาง",
                        "color": "#aaaaaa",
                        "size": "sm",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text":  `${row.distacne} km`,
                        "wrap": true,
                        "color": "#666666",
                        "size": "sm",
                        "flex": 5
                      }
                    ]
                  }
                ]
              }
            ]
          },
          "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "flex": 2,
                "style": "primary",
                "color": "#012971",
                "action": {
                  "type": "uri",
                  "label": "นำทาง",
                  "uri": `https://www.google.com/maps/dir/${event.message.latitude},${event.message.longitude}/${row.lat},${row.lng}`
                },
                "height": "sm",
                "color": "#012971"
              } 
            ],
            "flex": 0
          }
         
        }))
          
        var msg = {
          "type": "flex",
          "altText": "Flex Message",
          "contents": {
              "type": "carousel",
              "contents": pinData
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
    })
  })
 
}

app.set('port', (process.env.PORT || 4000))

app.listen(app.get('port'), function () {
  console.log('run at port', app.get('port'))
})
