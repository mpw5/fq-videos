const express = require('express');
const router = express.Router();
const moment = require('moment');
const fs = require('fs');
const schedule = require('node-schedule');

const {
  WebClient
} = require('@slack/web-api');

const user_token = process.env.SLACK_API_USER_TOKEN
const web = new WebClient(user_token);

var sorted_results

function compareValues(key, order = 'asc') {
  return function(a, b) {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
      return 0;
    }

    const varA = (typeof a[key] === 'string') ?
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ?
      b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order == 'desc') ? (comparison * -1) : comparison
    );
  };
}

async function get_results() {
  console.log('in get_results')
  const video_hosting_array = ['https://youtu', 'https://www.youtube', 'bandcamp.com', 'https://vimeo.com']
  var initial_response;
  var response;
  var matches;
  var results = [];

  for (const host of video_hosting_array) {
    console.log('getting results for ', host)
    initial_response = await web.search.messages({
      query: host + ' in:#friday-question',
      count: 100
    });

    var total_pages = initial_response['messages']['paging']['pages']
    var page

    console.log('total records: ', initial_response['messages']['total'])
    console.log('total pages: ', total_pages)
    for (page = 1; page <= total_pages; page++) {
      console.log('processing page ', page)

      response = await web.search.messages({
        query: host + ' in:#friday-question',
        page: page,
        count: 100
      });

      for (const result of response['messages']['matches']) {
        if (typeof(result['attachments']) != 'undefined') {
          for (const attachment of result['attachments']) {
            var video_html;

            if (attachment['service_name'] == 'YouTube' || attachment['service_name'] == 'Vimeo') {
              video_html = attachment['video_html'];
            } else {
              video_html = attachment['audio_html']; //bandcamp
            }

            if (typeof(video_html) != 'undefined') {
              let video = {
                username: '@' + result['username'],
                date: moment(new Date(result['ts'] * 1000)).format('YYYY/MM/DD HH:mm:ss'),
                title: attachment['title'],
                title_link: attachment['title_link'],
                video_html: video_html.replace("autoplay=1", "autoplay=0&rel=0")
              }

              results = results.concat(video);
            }
          }
        }
      }
    }
  }

  sorted_results = results.sort(compareValues('date'));

  fs.writeFile("results.txt", JSON.stringify(sorted_results), function(err) {
    if (err) {
      console.log(err);
    }
  });
}

router.get('/', (req, res) => {
  if(typeof(sorted_results) == 'undefined'){
    res.render('error');
  } else {
    res.render('index', {
      results: sorted_results
    });
  }
});

router.get('/results', (req, res) => {
  fs.readFile('results.txt', 'utf8', function(err, data) {
    if (err) {
      console.log(err);
    }else{
        console.log('reading results.txt')
        res.send({data: JSON.parse(data)});
    }
  });
});

<<<<<<< HEAD
schedule.scheduleJob('*/5 * * * *', function(){
=======
schedule.scheduleJob('*/10 * * * *', function(){
>>>>>>> 3f2c8e8... increase time between api calls
  get_results()
});

module.exports = router;
