import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import moment from 'moment';
import * as _ from 'lodash';
import csv from 'csvtojson';
import './App.css';

const apiUrl = 'http://localhost:3001'
const HOURS = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'];

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.onDrop = this.onDrop.bind(this);
  }

  componentWillMount() {
    this.fetchBookings();
  }

  fetchBookings() {
    fetch(`${apiUrl}/bookings`)
      .then((response) => response.json())
      .then((bookings) => {
        this.setState({ bookings });
      });
  }

  onDrop(files) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileAsBinaryString = reader.result;

      return csv({ output: "json" })
        .fromString(fileAsBinaryString)
        .then(csvRows => {
          fetch(`${apiUrl}/bookings`, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(csvRows)
          })
            .then((response) => response.json())
            .then((bookings) => {
              this.setState({ bookings });
            });
        });
    };

    reader.readAsText(files[0], 'ISO-8859-1');
  }

  render() {
    return (
      <div className="App">
        <div className="card">
          <div className="card-header">Booking Schedule
          <div className="row">
              <div className="booking small isNew">New</div>
              <div className="booking small">Existing</div>
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
    let bookings = this.formatBookings();
    return (
      <div className="timetable">
        <div className="timetable-header">
          {HOURS.map((hour, i) => {
            return <div key={i} className="timetable-legend top-legend">{hour}</div>
          })}
        </div>
        {this.renderBookings(bookings)}
      </div>

    );
  }

  renderBookings(bookings) {
    return Object.keys(bookings).map((key, i) => {
      const dayBookings = bookings[key];
      return (<div className="timetable-day" key={i}>
        <div className="timetable-legend side-legend">{key}</div>
        <div className="timetable-day-schedule">
          {dayBookings.map((booking, i) => {
            const hours = booking.duration / 60 / 1000 / 60; //hours
            const width = hours * (100 / 24);
            return (
              <div key={i} className={`booking ${booking.newBooking ? 'isNew' : ''}`} style={{
                width: `${width}%`,
                transform: `translateX(${100 * booking.timeString / hours}%)`
              }}>
                {moment(booking.time).format('HH:mm a')} - {moment(booking.time).add(hours, 'hours').format('HH:mm a')}
              </div>
            );
          })}
        </div>
      </div>);
    });
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

  formatBookings() {
    const { bookings } = this.state;
    let formattedBookings = bookings.map((booking) => {
      const timestamp = moment(booking.time);
      const year = timestamp.format('YYYY');
      const dayAndDate = timestamp.format('MMM Do');
      const timeString = timestamp.format('H');
      return { ...booking, year, dayAndDate, timeString }
    });
    formattedBookings = _.groupBy(formattedBookings, (booking) => {
      return booking.dayAndDate;
    })
    return formattedBookings;
  }
}

export default App;
