import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Api, Websocket } from 'cosmoport-core-api-client';
import { useParams } from 'react-router-dom';
import Time from '../components/Time';
import CalendarDate from '../components/CalendarDate';
import Trapeze from '../components/Trapeze';
import Countdown from '../components/Countdown';
import TableRow from '../components/TableRow';
import Guid from '../class/Guid';
import SomethingCool from '../components/SomethingCool';
import TableHeader from '../components/TableHeader';
import * as Icons from "@mui/icons-material";
import { snakeCase, camelCase }  from  "lodash";
import testData from "./testdata.json"
// Design
require('../../../assets/resources/v1/async.app');
require('../../../assets/resources/v1/defer.app');

const generateIcon = (variation, props = {}) => {
  const IconName = Icons[variation];
  return <IconName {...props} />;
};
const upperFirst = (str ) => str ? (str.charAt(0).toUpperCase() + str.slice(1)): str;
const errorMessage = (error) =>
  console.error(`Error #${error.code || '000'}: ${error.message}`, 'error');
const defaultLocale = {
  code: 'xx',
  default: true,
  id: 0,
  localeDescription: '',
  show: true,
  showTime: 1,
};

function withParams(Component) {
  return function (props) {
    return <Component {...props} params={useParams()} />;
  };
}

class Main extends Component {
  static propTypes = {
    params: PropTypes.shape({ gate_id: PropTypes.string }),
  };

  static defaultProps = {
    params: {
      gate_id: '0',
    },
  };

  constructor(props) {
    super(props);

    this.state = {
      allEventsForToday: null,
      currentEventAndNextOne: null,
      currentEventNew: null,
      nextEventsNew: [],

      api: null,
      socket: null,
      gateNo: this.props.params.gate_id,
      lastEventId: 0,
      events: [],
      nextEvents: [],
      facilities: [],
      materials: [],
      settings: [],
      type: '',
      refData: {},
      locales: [],
      nextLocaleIndex: 0,
      i18n: {},
      shouldShow: false,
      // The number of minutes to show events after they ended
      shouldShowTimeout: 60,
      shouldShowTime: 10,
      currentEvent: [],
     };
  }

  componentDidMount() {
    this.init(this.props.config);
    this.setState({ gateNo: this.props.params.gate_id });
    this.fetchData(); // Fetch data initially
    this.intervalId = setInterval(this.fetchData, 5000); //60000 // Set up interval to fetch data every minute
    // this.intervalId = setInterval(this.fetchData, 10000);
  }

  componentWillUnmount() {
    clearTimeout(this.timerID);
    clearTimeout(this.showTimerId);
    clearInterval(this.intervalId); // Clean up interval on component unmount
    this.state.socket.close();
  }

  fetchData = async () => {
    try {
      if (this.state.api !== null) {
        const currentDate = new Date();

        // год, месяц и день
        const year = currentDate.getFullYear();

        // Месяц начинается с 0, поэтому добавляем 1
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day}`;
        const currentTimeInMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
        // console.log({formattedDate, gate_id: this.props.params.gate_id, lastEventId: this.state.lastEventId})
        await Promise.all([
          //this.state.api.fetchEventsByIdForGate(this.state.lastEventId === 0 ? 5 : this.state.lastEventId),
          this.state.api.fetchEventsByIdForGate(this.state.lastEventId),
          this.state.api.fetchEventsInRange(formattedDate, formattedDate, this.props.params.gate_id)
        ])
        .then((data) => {
          // console.log('fetchData->data=', data)
          return this.setState(
            {
              currentEventNew: data[0][0],
              nextEventsNew: data[1].filter((e) => (e.startTime > currentTimeInMinutes && e.gateId == this.props.params.gate_id)),
            },
            () => {
              this.getCurrentEventData();
            },
          )
        })
        .catch((error) => errorMessage(error));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  getCurrentEventData = () => {
    const currentEventNew = this.state.currentEventNew;

    if (typeof currentEventNew !== 'undefined' && currentEventNew !== null) {
      this.setState({ lastEventId: currentEventNew.id });

      const currentDate = new Date();
      const evId = currentEventNew.id;
      const startTimeInMin = currentEventNew.startTime;
      const endTimeInMin = currentEventNew.startTime + currentEventNew.durationTime;
      const currentTimeInMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

      let tType = '';
      // {"startTimeInMin": 1067, "currentTimeInMinutes": 1062, "endTimeInMin": 1247, "tType": ""}
      // {"startTimeInMin": 17:47, "currentTimeInMinutes": 17:42, "endTimeInMin": 20:47, "tType": ""}

      //{startTimeInMin: 1110, currentTimeInMinutes: 1111, endTimeInMin: 1290, tType: 'before_departion'}
      //if (startTimeInMin <= currentTimeInMinutes) {

      // { "startTimeInMin": 707, "currentTimeInMinutes": 710, "endTimeInMin": 887, "tType": "before_departion" }
      if (startTimeInMin > currentTimeInMinutes) {
        tType = 'before_departion';
        // console.log({tType, startTimeInMin, op: '>', currentTimeInMinutes})
      } else if(endTimeInMin >= currentTimeInMinutes) {
        tType = 'departed';
        // console.log({tType, endTimeInMin, op: '>=', currentTimeInMinutes})
      }

      if (currentTimeInMinutes >= endTimeInMin - 5) {
        tType = 'before_return';
        // console.log({tType, currentTimeInMinutes, op: '>=', endTimeInMin: (endTimeInMin - 5)})
      }

      //console.log(`#${evId}: getCurrentEventData->Current Event:`, currentEventNew);
      //console.log(`#${evId}: getCurrentEventData->type:`, tType);
      // if (currentTimeInMinutes >= endTimeInMin -5) {
      //   tType = 'started';
      // }
      // console.log({startTimeInMin, currentTimeInMinutes, endTimeInMin, tType})

      this.setState({ shouldShow: true, lastEventId: evId, type: tType });
    }
  };

  getCurrentLocale = () =>
    this.state.locales.length > 0 && this.state.nextLocaleIndex > -1
      ? this.state.locales[
          this.state.nextLocaleIndex % this.state.locales.length
        ]
      : defaultLocale;

  getLocale() {
    if (Object.is(this.state.i18n, {}) || this.state.locales.length < 1) {
      return '';
    }

    const locale = this.getCurrentLocale();

    return this.state.i18n[locale.code];
  }

  getLocaleProp(property, uppercase) {
    if (property === undefined) {
      return '';
    }

    const locale = this.getLocale();
    if (locale === undefined || locale === defaultLocale) {
      return '';
    }

    return Object.prototype.hasOwnProperty.call(locale, property)
      ? uppercase
        ? locale[property].toUpperCase()
        : locale[property]
      : '';
  }

  getEvent = (id) => {
    this.state.api
      .fetchEventsByIdForGate(id)
      .then((evs) => {
        this.setState({ events: evs, lastEventId: id });
      })
      .catch((error) => errorMessage(error));
  };

  getEventWithCallback = (id, callback) => {
    this.state.api
      .fetchEventsByIdForGate(id)
      .then((evs) => {
        this.setState({ events: evs, lastEventId: id });
      })
      .then(() => callback())
      .catch((error) => errorMessage(error));
  };

  getData = (callback) => {
    const currentDate = new Date();

    // год, месяц и день
    const year = currentDate.getFullYear();

    // Месяц начинается с 0, поэтому добавляем 1
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;

    Promise.all([
      this.state.api.get('/t_events/types?isActive=true'),
      this.state.api.get('/category?localeId=1&isActive=true'),
      this.state.api.get('/t_events/statuses'),
      this.state.api.get('/t_events/states'),
      this.state.api.fetchTranslations(),
      this.state.api.fetchVisibleLocales(),
      this.state.api.fetchEventsByIdForGate(this.state.lastEventId === 0 ? 5 : this.state.lastEventId),
      this.state.api.fetchEventsInRange(formattedDate, formattedDate, this.props.params.gate_id),
      this.state.api.get('/facility/all?isActive=true'),
      this.state.api.get('/material/all?isActive=true'),
      this.state.api.fetchSettings(),
    ])
      .then((data) =>
        this.setState(
          {
            refData: {
              types: data[0],
              typeCategories: data[1],
              statuses: data[2],
              states: data[3],
            },
            i18n: data[4],
            locales: data[5],
            events: data[6],
            nextEvents: data[7],
            facilities: data[8],
            materials: data[9],
            settings: data[10],
          },
          () => {
            callback();
          },
        ),
      )
      .catch((error) => errorMessage(error));
  };

  getCurentEvent = () => {
    const currentDate = new Date();

    // год, месяц и день
    const year = currentDate.getFullYear();

    // Месяц начинается с 0, поэтому добавляем 1
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;

    this.state.api
      .fetchEventsInRange(formattedDate, formattedDate, this.props.params.gate_id)
      .then((data) => {
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const currentTimeInMin = hours * 60 + minutes;
        const settings = Array.isArray(this.state.settings) ? this.state.settings : [];
        console.log({settings})
        const boardingTime = parseInt(
            settings.find((setting) => setting.param === 'boarding_time')
              ?.value,
            5,
          ) || 5;

        const currentEvent = data.filter((ev) =>
            ev
            && ev.startTime < currentTimeInMin - ev.durationTime    // время начала
            && ev.startTime + ev.durationTime < currentTimeInMin // время окончания
            && ev.gateId == this.props.params.gate_id
          );

        this.setState({ currentEvent: currentEvent[0]});
      })
      // .then(() => callback())
      .catch((error) => errorMessage(error));
  };

  init = (config) => {
    const self = this;
    const socket0 = new Websocket({
      url: `ws://${config.address.ws}/events?id=gate&id=${Guid.get()}&id=${
        this.props.params.gate_id
      }`,

      onopen() {},

      onmessage(...args) {
        const message = args[0].data;
        if (message.match(/:fire_gate\|\d+\|\d+\|\d+\|[a-z_]+/i)) {

          const [_, gateId, gate2Id, eEventId, tType] = message.split('|');
          const gate =
            tType === 'before_departion'
              ? parseInt(gateId, 10)
              : tType === 'before_return'
              ? parseInt(gate2Id, 10)
              : 0;

          if (gate === parseInt(self.props.params.gate_id, 10)) {
            const evId = parseInt(eEventId, 10);
            console.log('onmessage()->tType', tType)
            self.setState(
              { shouldShow: true, lastEventId: evId, type: tType },
              () => {
                clearTimeout(self.showTimerId);
                self.getEventWithCallback(evId, () => {
                  const theTime =
                    self.calculateCountdown(self.state.events[0]) +
                    self.state.shouldShowTimeout;
                  self.showTimerId = setTimeout(
                    () => {
                      self.showing();
                    },
                    theTime * 60 * 1000,
                  );
                });
              },
            );
          }
        }

        if (message === ':reload' || message === ':update-nodes:') {
          self.getData(() => {
            if (self.state.lastEventId === 0) {
              self.getCurentEvent();
            } else {
              self.getEvent(self.state.lastEventId);
            }
          });
        }

        if (message === ':timeout_update') {
          clearTimeout(self.timerID);
          self.getData(() => self.refreshLocaleLoop());
        }
      },

      onclose() {
        if (self.state.socket) {
          self.state.socket.close();
        }
      },

      onerror(...args) {
        console.error(args);
      },
    });

    this.setState(
      {
        api: new Api(`http://${config.address.server}`),
        socket: socket0,
      },
      () => {
        this.state.api
          .fetchTime()
          .then((data) => this.setState({ timestamp: data.timestamp }))
          .catch();

        this.getData(() => {
          this.tick();
        });
      },
    );
  };

  refreshLocaleLoop = () => {
    // this.tick();
    this.timerID = setTimeout(
      () => this.tick(),
      this.getCurrentLocale().showTime * 1000,
    );
    // this.showTimerId = setTimeout(() => { this.showing(); }, this.state.shouldShowTime * 1000);
  };

  tick = () => {
    const nextIndex =
      (this.state.nextLocaleIndex + 1) % this.state.locales.length;
    this.setState({ nextLocaleIndex: nextIndex }, this.refreshLocaleLoop);
  };

  showing = () => {
    this.setState({ shouldShow: false, events: [] });
  };

  handleGateClick = () => {};

  renderTypeDescription = (val, refData) => {
    const typeData = refData.types.find((type) => type.id === val);

    return typeData ? this.getLocaleProp(typeData.descCode) : val;
  };

  renderStatus(val, refData) {
    const statusData = refData.statuses.find((status) => status.id === val);

    return statusData
      ? this.getLocaleProp(statusData.code, true)
      : val > 0
      ? val
      : ' ';
  }

  renderDuration = (minutes) => {
    const h = Math.trunc(minutes / 60);
    const m = minutes % 60;

    return `${h} ${this.getLocaleProp(
      'ui_caption_hours',
    )} ${m} ${this.getLocaleProp('ui_caption_minutes')}`;
  };

  renderIcon = (typeId, refData) => {
    const typeData = refData.types.find((t) => t.id === typeId);
    const categoryId = typeData ? typeData.categoryId : 1;

    return <i
      className={{ 0: '', 1: 'i-man', 2: 'i-radar', 3: 'i-space' }[categoryId % 3]}
    />
  };

  renderCategoryName(val, refData) {
    let subtypeName = '';

    let typeData = refData.types.find((t) => t.id === val);

    if (!typeData) {
      return val;
    }

    if (typeData.parentId !== null) {
      subtypeName = ` | ${this.getLocaleProp(typeData.nameCode, true)}`;

      const parentData = refData.types.find((t) => t.id === typeData.parentId);

      typeData = parentData;
    }

    const typeName = this.getLocaleProp(typeData.nameCode, true);

    const categoryData = refData.typeCategories.find(c => c.id === typeData.categoryId);

    if (!categoryData) {
      return `${typeName}${subtypeName}`;
    }

    const categoryName = this.getLocaleProp(categoryData.code, true);

    if (typeData.categoryId === 1) { // Birthday Party
      return categoryName;
    }

    return `${categoryName} | ${typeName}${subtypeName}`;
  }

  renderTypeName(val, refData) {
    let typeData = refData.types.find((t) => t.id === val);

    if (typeData.parentId !== null) {
      const parentData = refData.types.find((t) => t.id === typeData.parentId);

      typeData = parentData;
    }

    return typeData
      ? `${this.getLocaleProp(typeData.nameCode, true)}`
      : val;
  }

  renderSubtypeName(val, refData) {
    const typeData = refData.types.find((t) => t.id === val);

    if (typeData.parentId !== null) {
      return typeData
        ? `${this.getLocaleProp(typeData.nameCode, true)}`
        : val;
    }

    return '';
  }

  // отсчёт времени начинается за 5 минут до начала/окончания мероприятия
  calculateCountdown = (event) => {
    const date = new Date();

    let to = 0;
    let time = 0;
    if (this.state.type === 'before_departion') {
      to = event.startTime;
      time = to - (date.getHours() * 60 + date.getMinutes());
    } else if (this.state.type === 'before_return') {
      to = event.startTime + event.durationTime;
      time = to - (date.getHours() * 60 + date.getMinutes());
    } else if (this.state.type === 'departed') {
      const currentDate = new Date();
      const currentTimeInMinutes = (typeof event === 'undefined' || event === null) ?
      currentDate.getHours() * 60 + currentDate.getMinutes() : event.startTime + 5;

      // to = (event.startTime + event.durationTime) - currentTimeInMinutes
      // console.log({
      //   startTime: event.startTime,
      //   durationTime: event.durationTime,
      //   currentTimeInMinutes,
      // })

      time = event.startTime + event.durationTime - currentTimeInMinutes;
    }

    // const time = to - (date.getHours() * 60 + date.getMinutes());
    // {to: 645(10 hrs 45 min), time: 4 (4 min), type: 'before_departion'}
    console.log({to, time, type: this.state.type})
    return time < 0 ? 0 : time;
  };

  render() {
    if (Object.is(this.state.i18n, {})) {
      return <div>No translation data.</div>;
    }

    const event = this.state.currentEventNew;
    const currentDate = new Date();
    const currentTimeInMinutes = (typeof event === 'undefined' || event === null) ?
      currentDate.getHours() * 60 + currentDate.getMinutes() : event.startTime + 5;

    const nextEvents = this.state.nextEventsNew;

    // console.log('render->nextEvents=', nextEvents)

    if (!nextEvents.length > 0 && !this.state.shouldShow) {
      return <SomethingCool />;
    }

    if (Object.is(this.state.refData, {})) {
      return <div>No refs</div>;
    }

    const nextLocale = this.getLocale();
    if (nextLocale === undefined || nextLocale === defaultLocale) {
      return <div>Loading...</div>;
    }

    let countdown = 0;
    let eventDescription = '';
    let facilitiesLi = <></>;
    let materialsLi = <></>;

    if (typeof event !== 'undefined' && event !== null) {
      countdown = this.calculateCountdown(event);

      eventDescription = this.renderTypeDescription(
        event.eventTypeId,
        this.state.refData,
      );
      // {fontSize: 'large'}
      facilitiesLi = this.state.facilities
        .filter((f) => event.facilityIds.includes(f.id))
        .map((f) => (
          <li key={f.id} >
            { f?.icon ?  generateIcon(upperFirst(camelCase(f.icon)), {sx: { fontSize: 40 }}) : ''} {nextLocale[f.code]}
          </li>
        ));

      materialsLi = this.state.materials
        .filter((m) => event.materialIds.includes(m.id))
        .map((m) => {
          const qty = event.qty.find(q => q.material_id === m.id);
          return (<li key={m.id} >
            { m?.icon ?  generateIcon(upperFirst(camelCase(m.icon)), {fontSize: 'large'}) : ''} {nextLocale[m.code]} {qty && `(${qty.qty})`}
          </li>)
      });
    }

    return (
      <div className="g-section__content">
        <div className="header">
          <div className="header__logo">
            <i className="i-logo header__logo-icon" />
          </div>
          <div className="header__info">
            <Time />
            <CalendarDate locale={nextLocale} />
          </div>
        </div>

        <div className="flight">
          {/* то же самое, что 65% */}
          <div style={{ height: '60vh' }}>
            { event ? (typeof event !== 'undefined' && event.eventStatusId !== 5) && (
              <div>
                <div className="flight__main">
                  {/* <div className="flight__left">
                    <div
                      className="flight__login flight-title _trapeze"
                      onClick={this.handleGateClick}
                    >
                      <div className="flight-title__top" />
                      <div className="flight-title__name flight__login-name">
                        {this.getLocaleProp('ui_caption_gate', true)}
                      </div>
                      <div className="flight-title__bottom" />
                    </div>
                    <div className="flight__number">
                      <Trapeze />
                      <div className="flight__number-body">{this.state.gateNo}</div>
                      <Trapeze position="_right" />
                    </div>
                  </div> */}

                  <div className="flight__center">
                    <div className="flight__line">
                      <div className="flight__line-title flight-title">
                        <div className="flight-title__top" />
                        <div className="flight-title__name">
                          {this.getLocaleProp('ui_caption_type', true)}
                        </div>
                        <div className="flight-title__bottom" />
                      </div>
                      <div className="flight__line-body">
                        <div className="flight__name">
                          <div className="flight__name-icon">
                            {this.renderIcon(event.eventTypeId, this.state.refData)}
                          </div>
                          <div className="flight__name-body">
                            <div className="flight__name-miss">
                              #{event.id} {this.renderCategoryName(
                                event.eventTypeId,
                                this.state.refData,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Trapeze position="_right" />
                    </div>
                    <div className="flight__line">
                      <div className="flight__line-title flight-title">
                        <div className="flight-title__top" />
                        <div className="flight-title__name">
                          DESCRIPTION
                        </div>
                        <div className="flight-title__bottom" />
                      </div>
                      <div className="flight__line-body">
                        <div className="flight__name">
                          <div className="flight__name-body">
                            {event.description}
                          </div>
                        </div>
                      </div>
                      <Trapeze position="_right" />
                    </div>
                    <div style={{ display: 'flex', width: '100%', marginTop: '10px' }}>
                      <div style={{ width: '50%', paddingRight: '0.5em' }}>
                        <div className="flight__line">
                          <div className="flight__line-title flight-title">
                            <div className="flight-title__top" />
                            <div className="flight-title__name">
                              {this.getLocaleProp('ui_caption_duration', true)}
                            </div>
                            <div className="flight-title__bottom" />
                          </div>
                          <div className="flight__line-body">
                            {this.renderDuration(event.durationTime)}
                          </div>
                          <Trapeze position="_right" />
                        </div>
                      </div>
                      <div style={{ width: '50%', paddingLeft: '0.5em' }}>
                        <div className="flight__line flight__line--status">
                          <div className="flight__line-title flight-title">
                            <div className="flight-title__top" />
                            <div className="flight-title__name">
                              {this.getLocaleProp('ui_caption_status', true)}
                            </div>
                            <div className="flight-title__bottom" />
                          </div>
                          <div className="flight__line-body">
                            {this.renderStatus(event.eventStatusId, this.state.refData)}
                          </div>
                          <Trapeze position="_right" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flight__right">
                    <div className="flight__time">
                      <div className="flight__time-title flight-title _trapeze">
                        <div className="flight-title__top" />
                        <div className="flight-title__name flight__time-wrap">
                          {this.getLocaleProp('ui_caption_time_etd', true)}
                        </div>
                        <div className="flight-title__bottom" />
                      </div>
                      <Countdown minutes={countdown} />
                    </div>
                  </div>
                </div>
                <div className="flight__description">
                  {eventDescription !== '' && <Trapeze />}
                  {eventDescription !== '' && (
                    <div className="flight__description-body">{eventDescription}</div>
                  )}
                  {eventDescription !== '' && <Trapeze position="_right" />}
                </div>

                <div style={{ display: 'flex', marginTop: '2em' }}>
                  <div style={{ width: '50%', paddingRight: '0.5em' }}>
                    <div className="flight__login flight-title _trapeze">
                      <div className="flight-title__top" />
                      <div className="flight-title__name flight__login-name">
                        FACILITIES
                      </div>
                      <div className="flight-title__bottom" />
                    </div>
                    <div className="flight__number">
                      <Trapeze />
                      <div className="flight__description-body">
                        <ul className="ul_threeColumns">
                          {facilitiesLi}
                        </ul>
                      </div>
                      <Trapeze position="_right" />
                    </div>
                  </div>
                  <div style={{ width: '50%', paddingLeft: '0.5em' }}>
                    <div className="flight__login flight-title _trapeze">
                      <div className="flight-title__top" />
                      <div className="flight-title__name flight__login-name">
                        MATERIALS
                      </div>
                      <div className="flight-title__bottom" />
                    </div>
                    <div className="flight__number">
                      <Trapeze />
                      <div className="flight__description-body">
                        <ul className="ul_threeColumns">
                          {materialsLi}
                        </ul>
                      </div>
                      <Trapeze position="_right" />
                    </div>
                  </div>
                </div>
              </div>
            ) : <code>Empty event</code> }
          </div>

          <div style={{ height: '25vh' }}>
            {nextEvents.length > 0 && (
              <div className="flight__bottom">
                <div className="flight__title">
                  NEXT EVENTS
                  {/* {this.getLocaleProp('ui_caption_next_event', true)} */}
                </div>
                <div className="flight__next">
                <TableHeader
                  locale={nextLocale}
                />
                <TableRow
                  key={nextEvents[0].id}
                  event={nextEvents[0]}
                  locale={nextLocale}
                  refs={this.state.refData}
                />
                {
                  nextEvents[1] && (
                    <TableRow
                      key={nextEvents[1].id}
                      event={nextEvents[1]}
                      locale={nextLocale}
                      refs={this.state.refData}
                    />
                  )
                }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default withParams(Main);
