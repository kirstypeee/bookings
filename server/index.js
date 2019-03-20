const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const _ = require('lodash');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // so that app can access

const formatBookings = (rawBookings) => {
  return rawBookings.map((bookingRecord) => ({
    time: Date.parse(bookingRecord.time),
    duration: bookingRecord.duration * 60 * 1000, // mins into ms
    userId: bookingRecord.user_id,
  }))
}

const bookings = formatBookings(JSON.parse(fs.readFileSync('./server/bookings.json')));

app.get('/bookings', (_, res) => {
  res.json(bookings);
});

app.post('/bookings', (req, res) => {
  const newBookings = formatBookings(req.body);
  newBookings.map(row => {
    return row.newBooking = true;
  })
  const allBookings = _.concat(newBookings, bookings);
  res.json(allBookings);
});

app.listen(3001);
