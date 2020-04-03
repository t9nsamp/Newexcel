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
	res.send('UOB-bot')
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
          "type": "bubble",
          "size": "kilo",
          "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "margin": "md",
                "contents": [
                  {
                    "type": "text",
                    "text": `${row.bank} ${row.name}`,
                    "weight": "bold",
                    "size": "lg",
                    "wrap": true
                  },
                  {
                    "type": "icon",
                    "size": "xl",
                    "url": "https://ran-ln.tk/saveIMG/tmrw.png"
                  }
                ]
              },
              // {
              //   "type": "text",
              //   "text": `${row.bank} ${row.name}`,
              //   "weight": "bold",
              //   "size": "lg",
              //   "wrap": true
              // },       
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
                        "type": "icon",
                        "url": "https://ran-ln.tk/saveIMG/location.png"
                      },

                      {
                        "type": "text",
                        "text": "ที่อยู่",
                        "color": "#aaaaaa",
                        "size": "sm",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text": `${row.road}`,
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
                        "url": "https://ran-ln.tk/saveIMG/time.png"
                      },

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
                        "url": "https://ran-ln.tk/saveIMG/phone2.png"
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
                        "url": "https://ran-ln.tk/saveIMG/latlng1.png"
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
            ],
            // "borderColor": "#002469",
            // "borderWidth": "3px"
            "backgroundColor": "#F9F8F7"
          },
           "footer":                     {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "filler"
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  {
                    "type": "filler"
                  },
                  {
                    "type": "icon",
                    "url": "https://sv1.picz.in.th/images/2020/04/01/Qrk0yq.png"
                  },
                  {
                    "type": "text",
                    "text": "กดนำทาง",
                    "color": "#ffffff",
                    "offsetTop": "-2px",
                    "margin": "md",
                    "flex": 0
                  },
                  {
                    "type": "filler"
                  }
                ],
                "spacing": "sm",
                "action": {
                  "type": "uri",
                  "label": "action",
                  "uri": `https://www.google.com/maps/dir/${event.message.latitude},${event.message.longitude}/${row.lat},${row.lng}`
                }
              },
              {
                "type": "filler"
              }
            ],
            "borderWidth": "2px",
            "cornerRadius": "8px",
            "spacing": "sm",
            "borderColor": "#ffffff",
            "margin": "md",
            "height": "40px",
            "backgroundColor": "#48484899"
          }
           //{
          //   "type": "box",
          //   "layout": "vertical",
          //   "spacing": "sm",
          //   "contents": [
          //     {
          //       "type": "button",
          //       "flex": 2,
          //       "style": "primary",
          //       "color": "#012971",
          //       "action": {
          //         "type": "uri",
          //         "label": "นำทาง",
          //         "uri": `https://www.google.com/maps/dir/${event.message.latitude},${event.message.longitude}/${row.lat},${row.lng}`
          //       },
          //       "height": "sm",
          //       "color": "#012971"
          //     },
          //     {
          //       "type": "button",
          //       "flex": 2,
          //       "style": "link",
          //       "height": "sm",
          //       "action":  {
          //         "type": "uri",
          //         "label": "เปิดบัญชีเงินฝาก",
          //         "uri": "https://uniservices1.uobgroup.com/secure/forms/th/business/business-account-opening/index.html?lang=th?s_cid=default-landing"
          //       }
          //     }  
          //   ],
          //   "flex": 0
          // }
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
