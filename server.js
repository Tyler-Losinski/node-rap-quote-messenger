var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var sendmail = require('sendmail')();
var CronJob = require('cron').CronJob;
var app     = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  response.send('Welcome!')
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

//Send text every day at 8am
var job = new CronJob('00 00 7 * * 1-7', function() {
    ScrapeAndSend();
  }, function () {
    /* This function is executed when the job stops */
  },
  true /* Start the job right now */
);

//Used for testing
app.get('/scrape', function(req, res){
  ScrapeAndSend();
})

//Scrapes the website http://www.rapquote.com/ for new rap quotes
function ScrapeAndSend(){
  // Website to scrape
  url = 'http://www.rapquote.com/';

  //Where the scraping happens
  request(url, function(error, response, html){
    if(!error){
      var $ = cheerio.load(html);

      var quote, quotee;
      var json = [{ quote : "", quotee : ""}];

      var promises = [];//Used to deal with the asyc of .each function

      $('.entry-content blockquote').each(function(){
          var data = $(this);

          quote = data.text().trim();
          quotee = data.next().text().trim();
          json.push({quote : quote, quotee: quotee});
          promises.push(json);
        
      })

      //this sends the text after it gets the quotes
      Promise.all(promises)
      .then(SendText(json))
      .catch();

    }
  })
}

//Sends the text via email using smp gateways provided by cell providers
function SendText(json){
  console.log(json.length);
  var ranNum = Math.floor(Math.random() * (json.length - 1));

  var textBody = 'Rap quote of the day: "' + json[ranNum].quote + '"  - ' + json[ranNum].quotee;

  //Get rid of anything other than ASCII
  textBody = textBody.replace(/[^\x00-\x7F]/g, "");
  //Splite the quote into strings of size 145 characters
  var arrayOfText = textBody.match(/(.|[\r\n]){1,145}/g);

  arrayOfText.forEach(function(element) {
    sendmail({
      from: 'RapQuoteOfTheDay@pimpin.com',
      to: '[Your phone number here]', 
      html: element,
    }, function(err, reply) {
      console.log(err && err.stack);
    });
  }, this);

  console.log('text sent');
}
