    const express = require('express')
  const bodyParser = require('body-parser');
  var request = require('request');
  const line = require('@line/bot-sdk')
  const restClient = new (require('node-rest-client').Client)
  const excelToJson = require('convert-excel-to-json')
  const geolib = require('geolib')

  const peavolta_bank = excelToJson(
    {
      sourceFile: 'Bank.xlsx',
      columnToKey: {
        '*': '{{columnHeader}}'
      } ,
      range: 'A2:Q156'
   })

   const peavolta_atm = excelToJson(
    {
      sourceFile: 'Atm.xlsx',
      columnToKey: {
        '*': '{{columnHeader}}'
      } ,
      range: 'A2:Q423'
   })

   const peavolta_pum = excelToJson(
    {
      sourceFile: 'Pum.xlsx',
      columnToKey: {
        '*': '{{columnHeader}}'
      } ,
      range: 'A2:Q38'
   })

   const peavolta_tmrw = excelToJson(
    {
      sourceFile: 'Tmrw.xlsx',
      columnToKey: {
        '*': '{{columnHeader}}'
      } ,
      range: 'A2:Q235'
   })

   var text = "text"

  // const peavolta_atm = excelToJson({
  //   sourceFile: 'atm.xlsx',
  //   columnToKey: {
  //       '*': '{{columnHeader}}'
  //   },
  //   range: 'A2:N422'
  // })

  // const peavolta_pub = excelToJson({
  //   sourceFile: 'pub.xlsx',
  //   columnToKey: {
  //       '*': '{{columnHeader}}'
  //   },
  //   range: 'A2:N38'
  // })

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

      if(req.body.events[0].type === 'message'  && req.body.events[0].message.type === 'text'){

          postToDialogflow(req);
         text = req.body.events[0].message.text
        }

      else if (req.body.events[0].type === 'message' && req.body.events[0].message.type === 'location'){ 

    Promise
      //.all(req.body.events.map(handleEvent))
      .all(req.body.events.map(handleLocationEvent))
      .then((result) => res.json(result))
      .catch(err => console.log('err', err))

      }

  });


  var select = (a) =>{
    if( a == "bank"){ return peavolta_bank.Sheet1}
    else if( a == "atm") {return peavolta_atm.Sheet1}
    else if( a == "pum") {return peavolta_pum.Sheet1}
    else if( a == "tmrw") {return peavolta_tmrw.Sheet1}
  }


  function handleLocationEvent(event) {
 //   var sheet_select = ('text1','text2')
 
    return new Promise((resolve, reject) => {
        var userlat = parseFloat(event.message.latitude)
        var userlng = parseFloat(event.message.longitude)
        var voltajson = select(text)       
        //peavolta.Sheet1
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
                      "text": `${row.category} ${row.name}`,
                      "weight": "bold",
                      "size": "lg",
                      "wrap": true
                    }
                  ]
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
                          "type": "icon",
                          "size": "3xl",
                          "url": row.logo
                        },

                      ]
                    },
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
                          "text": `${row.address}`,
                          "wrap": true,
                          "color": "#666666",
                          "size": "sm",
                          "flex": 6
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
                          "text": `${row.workday} `,
                          "wrap": true,
                          "color": "#666666",
                          "size": "sm",
                          "flex": 6
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
                          "text": `${row.tel}`,
                          "wrap": true,
                          "color": "#666666",
                          "size": "sm",
                          "flex": 6
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
                          "flex": 6
                        }
                      ]
                    },
                    {
                      "type": "box",
                      "layout": "baseline",
                      "spacing": "sm",
                      "contents": [  


                        {
                          "type": "text",
                          "text": `${row.Note}`,
                          "wrap": true,
                          "color": "#FC3F3F", 
                          "size": "sm",
                          "flex": 10
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
            "footer":{
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
                },
                {
                  "type": "button",
                  "flex": 2,
                  "style": "link",
                  "height": "sm",
                  "action":  {
                    "type": "uri",
                    "label": "เปิดบัญชีเงินฝาก",
                    "uri": "https://uniservices1.uobgroup.com/secure/forms/th/business/business-account-opening/index.html?lang=th?s_cid=default-landing"
                  }
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
