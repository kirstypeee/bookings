import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import moment from 'moment';
import * as _ from 'lodash';
import csv from 'csvtojson';
import { extendMoment } from 'moment-range';
import './App.css';

const Moment = extendMoment(moment);

const apiUrl = 'http://localhost:3001'
const HOURS = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'];

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.onDrop = this.onDrop.bind(this);
    this.submitBookings = this.submitBookings.bind(this);
  }

  componentWillMount() {
    this.fetchBookings();
  }

  fetchBookings() {
    fetch(`${apiUrl}/bookings`)
      .then((response) => response.json())
      .then((bookings) => {
        this.setState({ bookings: this.formatBookings(bookings) });
      });
  }

  submitBookings() {
    fetch(`${apiUrl}/bookings`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.state.uniqueBookings)
    }).then((response) => response.json())
      .then((bookings) => {
        this.setState({ bookings: this.formatBookings(bookings), uniqueBookings: null });
      });
  }

  onDrop(files) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileAsBinaryString = reader.result;

      return csv({ output: "json" })
        .fromString(fileAsBinaryString)
        .then(csvRows => {
          const uniqueBookings = this.determineOverlap(this.formatBookings(csvRows));
          this.setState({ uniqueBookings });
        });
    };

    reader.readAsText(files[0]);
  }

  render() {
    return (
      <div className="App">
        <div className="card">
          <div className="card-header">Booking Schedule
          <div className="row">
              <div className="booking small overlaps">Overlaps</div>
              <div className="booking small">Valid</div>
            </div>
          </div>
          {this.state.bookings ? this.renderTimetable() : <div className="loader" />}
        </div>
        {this.renderDropzone()}
      </div>
    );
  }

  renderTimetable() {
    //Assumption, all from the same year
    const { bookings } = this.state;
    return (
      <div className="timetable">
        <div className="timetable-header">
          {HOURS.map((hour, i) => {
            return <div key={i} className="timetable-legend top-legend">{hour}</div>
          })}
        </div>
        {this.renderBookings(bookings)}
        {this.state.uniqueBookings &&
          <div className="button-wrapper">
            <div className="confirmation-message">This is a preview. Bookings in red will not be saved as they overlap with existing bookings. Do you wish to continue?</div>
            <div className="button" onClick={this.submitBookings}>Confirm</div>
          </div>
        }
      </div>

    );
  }

  renderBookings(bookings) {
    return Object.keys(bookings).map((key, i) => {
      const dayBookings = bookings[key];
      return this.renderDay(i, key, dayBookings);
    });
  }

  renderDay(i, key, dayBookings) {
    return (<div className="timetable-day" key={i}>
      <div className="timetable-legend side-legend">{key}</div>
      <div className="timetable-day-schedule">
        {dayBookings.map((booking, i) => {
          return this.renderBooking(booking, i);
        })}
      </div>
    </div>);
  }

  renderBooking(booking, i) {
    const width = booking.hours * (100 / 24);
    return (
      <div key={i} className={`booking ${booking.overlaps ? 'overlaps' : ''}`} style={{
        width: `${width}%`,
        transform: `translateX(${100 * booking.timeString / booking.hours}%)`
      }}>
        {booking.timestamp.format('HH:mm a')} - {moment(booking.time).add(booking.hours, 'hours').format('HH:mm a')}
      </div>
    );
  }

  renderDropzone() {
    return (
      <div className="card">
        <div className="card-header">Upload New Bookings</div>
        <Dropzone accept=".csv" onDrop={this.onDrop} className="drop-zone">
          <i className="material-icons">add_box</i>
          <div className="light-text">Drag files here</div>
        </Dropzone>
      </div>)
  }

  formatBookings(rawBookings) {
    let formattedBookings = rawBookings.map((booking) => {
      const timestamp = moment(new Date(booking.time));
      return {
        timestamp: timestamp,
        time: new Date(booking.time),
        duration: booking.duration,
        hours: booking.duration / 60,
        userId: booking.user_id,
        dayAndDate: timestamp.format('MMM Do'),
        timeString: timestamp.format('H'),
      }
    });
    formattedBookings = _.groupBy(formattedBookings, (booking) => booking.dayAndDate);
    const sortedFormattedBookings = {};
    Object.keys(formattedBookings).sort().forEach((key) => sortedFormattedBookings[key] = formattedBookings[key]);
    return sortedFormattedBookings;
  }

  determineOverlap(newBookings) {
    const { bookings } = this.state;
    let validBookings = [];
    /**Do this on a per day basis */
    Object.keys(newBookings).forEach((key) => {
      let dayBookings = bookings[key];
      const newDayBookings = newBookings[key];
      /**Check for new days */
      if (!dayBookings) {
        bookings[key] = newDayBookings;
        validBookings = _.concat(newDayBookings, validBookings);
      }
      else {
        /**Sort by start time */
        const sortedBookings = _.sortBy(dayBookings, [(booking) => parseInt(booking.timeString, 10)]);
        const sortedNewBookings = _.sortBy(newDayBookings, [(booking) => parseInt(booking.timeString, 10)]);

        /**Iterate through all new bookings */
        sortedNewBookings.forEach((newBooking) => {
          const newRange = Moment.range(
            newBooking.timestamp,
            moment(newBooking.timestamp).add(newBooking.hours, 'hours')
          );
          /**Only iterate until a booking overlaps */
          sortedBookings.some((existingBooking) => {
            const existingRange = Moment.range(
              existingBooking.timestamp,
              moment(existingBooking.timestamp).add(existingBooking.hours, 'hours')
            );
            if (newRange.overlaps(existingRange)) {
              newBooking.overlaps = true;
              dayBookings.push(newBooking);
              return true;
            }
            dayBookings.push(newBooking);
            return false;
          })
        })
        bookings[key] = dayBookings;
        validBookings = _.concat(sortedNewBookings.filter((booking) => !booking.overlaps), validBookings);
      }
      this.setState({ bookings });
    })
    return validBookings;
  }
}

export default App;
