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
              "size": "mega",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  // {
                  //   "type": "image",
                  //   "url": "https://sv1.picz.in.th/images/2020/03/31/Q6go1V.png",
                  //   "size": "full",
                  //   "aspectMode": "cover",
                  //   "aspectRatio": "2:3",
                  //   "gravity": "top"
                  // },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                      {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                          {
                            "type": "text",
                            "text": `${row.bank} ${row.name}`,
                            "size": "xl",
                            "color": "#ffffff",
                            "weight": "bold"
                          }
                        ]
                      },
                      {
                        "type": "box",
                        "layout": "baseline",
                        "contents": [
                          {
                            "type": "icon",
                            "url": "https://sv1.picz.in.th/images/2020/03/31/Q6go1V.png"
                          },
                          {
                            "type": "text",
                            "text": `${row.phone}`,
                            "color": "#ebebeb",
                            "size": "sm",
                            "flex": 0,
                            "offsetTop": "-2px"
                          }
                        ],
                        "spacing": "md",
                        "margin": "md"
                      },
                      {
                        "type": "box",
                        "layout": "baseline",
                        "contents": [
                          {
                            "type": "icon",
                            "url": "https://sv1.picz.in.th/images/2020/03/31/Q6i73P.png"
                          },
                          {
                            "type": "text",
                            "text": `${row.time}`,
                            "color": "#ebebeb",
                            "size": "sm",
                            "flex": 0,
                            "offsetTop": "-3px"
                          }
                        ],
                        "spacing": "md",
                        "margin": "md"
                      },
                      {
                          "type": "box",
                          "layout": "baseline",
                          "contents": [
                            {
                              "type": "icon",
                              "url": "https://sv1.picz.in.th/images/2020/03/31/Q6qMZk.png"
                            },
                            {
                              "type": "text",
                              "text": `ระยะทาง : ${row.distacne} km`,
                              "color": "#ebebeb",
                              "size": "sm",
                              "flex": 0,
                              "offsetTop": "-3px"
                            }
                          ],
                          "spacing": "md",
                          "margin": "md"
                        },
                      {
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
                                "url": "https://sv1.picz.in.th/images/2020/03/31/Q6i3PV.png"
                              },
                              {
                                "type": "text",
                                "text": "กดเพื่อนำทาง",
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
                        "borderWidth": "1px",
                        "cornerRadius": "4px",
                        "spacing": "sm",
                        "borderColor": "#ffffff",
                        "margin": "md",
                        "height": "40px"
                      }
                    ],
                    "position": "absolute",
                    "offsetBottom": "0px",
                    "offsetStart": "0px",
                    "offsetEnd": "0px",
                    "backgroundColor": "#282828cc",
                    "paddingAll": "18px",
                    "paddingTop": "18px"
                  }
                ],
                "paddingAll": "0px"
              
            } //End 1st Bubble
        
          // "type": "bubble",
          // "size": "kilo",
          // "body": {
          //   "type": "box",
          //   "layout": "vertical",
          //   "contents": [
          //     {
          //       "type": "text",
          //       "text": `${row.bank} ${row.name}`,
          //       "weight": "bold",
          //       "size": "lg",
          //       "wrap": true
          //     },
          //     {
          //       "type": "box",
          //       "layout": "vertical",
          //       "margin": "lg",
          //       "spacing": "sm",
          //       "contents": [
          //         {
          //           "type": "box",
          //           "layout": "baseline",
          //           "spacing": "sm",
          //           "contents": [
          //             {
          //               "type": "text",
          //               "text": "เวลาทำการ",
          //               "color": "#aaaaaa",
          //               "size": "sm",
          //               "flex": 1
          //             },
          //             {
          //               "type": "text",
          //               "text": `${row.time}`,
          //               "wrap": true,
          //               "color": "#666666",
          //               "size": "sm",
          //               "flex": 5
          //             }
          //           ]
          //         },
          //         {
          //           "type": "box",
          //           "layout": "baseline",
          //           "spacing": "sm",
          //           "contents": [
          //             {
          //               "type": "text",
          //               "text": "ติดต่อ",
          //               "color": "#aaaaaa",
          //               "size": "sm",
          //               "flex": 1
          //             },
          //             {
          //               "type": "text",
          //               "text": `${row.phone}`,
          //               "wrap": true,
          //               "color": "#666666",
          //               "size": "sm",
          //               "flex": 5
          //             }
          //           ]
          //         },
          //         {
          //           "type": "box",
          //           "layout": "baseline",
          //           "spacing": "sm",
          //           "contents": [
          //             {
          //               "type": "text",
          //               "text": "ระยะทาง",
          //               "color": "#aaaaaa",
          //               "size": "sm",
          //               "flex": 1
          //             },
          //             {
          //               "type": "text",
          //               "text":  `${row.distacne} km`,
          //               "wrap": true,
          //               "color": "#666666",
          //               "size": "sm",
          //               "flex": 5
          //             }
          //           ]
          //         }
          //       ]
          //     }
          //   ]
          // },
          // "footer": {
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
    })
  })
 
}

app.set('port', (process.env.PORT || 4000))

app.listen(app.get('port'), function () {
  console.log('run at port', app.get('port'))
})
