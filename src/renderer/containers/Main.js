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

// Design
require('../../../assets/resources/v1/async.app');
require('../../../assets/resources/v1/defer.app');

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
      api: null,
      socket: null,
      gateNo: this.props.params.gate_id,
      lastEventId: 0,
      events: [],
      type: '',
      refData: {},
      locales: [],
      nextLocaleIndex: 0,
      i18n: {},
      shouldShow: false,
      // The number of minutes to show events after they ended
      shouldShowTimeout: 60,
      shouldShowTime: 10,
    };
  }

  componentDidMount() {
    this.init(this.props.config);
    this.setState({ gateNo: this.props.params.gate_id });
  }

  componentWillUnmount() {
    clearTimeout(this.timerID);
    clearTimeout(this.showTimerId);
    this.state.socket.close();
  }

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
        ? locale[property].values[0].toUpperCase()
        : locale[property].values[0]
      : '';
  }

  getEvent = (id) => {
    this.state.api
      .fetchEventsByIdForGate(id)
      .then((evs) => this.setState({ events: evs, lastEventId: id }))
      .catch((error) => errorMessage(error));
  };

  getEventWithCallback = (id, callback) => {
    this.state.api
      .fetchEventsByIdForGate(id)
      .then((evs) => this.setState({ events: evs, lastEventId: id }))
      .then(() => callback())
      .catch((error) => errorMessage(error));
  };

  getData = (callback) => {
    Promise.all([
      this.state.api.fetchReferenceData(),
      this.state.api.fetchTranslations(),
      this.state.api.fetchVisibleLocales(),
      this.state.api.fetchEventsByIdForGate(
        this.state.lastEventId > 0 ? this.state.lastEventId : 5,
      ),
    ])
      .then((data) =>
        this.setState(
          {
            refData: data[0],
            i18n: data[1],
            locales: data[2],
            events: data[3],
          },
          () => {
            callback();
          },
        ),
      )
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

        console.log(message);

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
            self.setState(
              { shouldShow: true, lastEventId: evId, type: tType },
              () => {
                clearTimeout(self.showTimerId);
                self.getEventWithCallback(evId, () => {
                  const theTime =
                    self.calculateCountdown(self.state.events[0]) +
                    self.state.shouldShowTimeout;
                  console.log('the time', theTime);
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

        if (message === ':reload') {
          self.getData(() => {
            if (self.state.lastEventId > 0) {
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

  renderTypeDescription = (val, values) => {
    const desc = values.types.find((type) => type.id === val);

    return desc ? this.getLocaleProp(desc.i18nEventTypeDescription) : val;
  };

  renderDestination(val, values) {
    const dest = values.destinations.find(
      (destination) => destination.id === val,
    );

    return dest ? this.getLocaleProp(dest.i18nEventDestinationName, true) : val;
  }

  renderStatus(val, values) {
    const stat = values.statuses.find((status) => status.id === val);

    return stat
      ? this.getLocaleProp(stat.i18nStatus, true)
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

  renderIcon = (typeId) => (
    <i
      className={{ 0: '', 1: 'i-man', 2: 'i-radar', 3: 'i-space' }[typeId % 3]}
    />
  );

  renderTypeTitle(val, values) {
    const typeName = values.types.find((name) => name.id === val);
    const cat = values.typeCategories.find(c => c.id === typeName.categoryId);

    return typeName
      ? `${this.getLocaleProp(cat.i18nEventTypeCategoryName, true)}:`
      : val;
  }

  renderTypeName(val, values) {
    const subName = values.types.find((name) => name.id === val);

    return subName
      ? `${this.getLocaleProp(subName.i18nEventTypeName, true)}`
      : val;
  }

  calculateCountdown = (event) => {
    const date = new Date();

    let to = 0;
    if (this.state.type === 'before_departion') {
      to = event.startTime;
    } else if (this.state.type === 'before_return') {
      to = event.startTime + event.durationTime;
    }

    const time = to - (date.getHours() * 60 + date.getMinutes());

    return time < 0 ? 0 : time;
  };

  render() {
    if (Object.is(this.state.i18n, {})) {
      return <div>No translation data.</div>;
    }

    if (!this.state.events.length > 0 || !this.state.shouldShow) {
      return <SomethingCool />;
    }

    if (Object.is(this.state.refData, {})) {
      return <div>No refs</div>;
    }

    const nextLocale = this.getLocale();
    if (nextLocale === undefined || nextLocale === defaultLocale) {
      return <div>Loading...</div>;
    }

    const [event, nextEvent] = this.state.events;
    const countdown = this.calculateCountdown(event);

    const eventDescription = this.renderTypeDescription(
      event.eventTypeId,
      this.state.refData,
    );

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
          <div className="flight__main">
            <div className="flight__left">
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
            </div>

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
                      {this.renderIcon(event.eventTypeId)}
                    </div>
                    <div className="flight__name-body">
                      <div className="flight__name-miss">
                        {this.renderTypeTitle(
                          event.eventTypeId,
                          this.state.refData,
                        )}
                      </div>
                      <div className="flight__name-title">
                        {this.renderTypeName(
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
                    {this.getLocaleProp('ui_caption_destination', true)}
                  </div>
                  <div className="flight-title__bottom" />
                </div>
                <div className="flight__line-body">
                  {this.renderDestination(
                    event.eventDestinationId,
                    this.state.refData,
                  )}
                </div>
                <Trapeze position="_right" />
              </div>
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
          {nextEvent && (
            <div className="flight__bottom">
              <div className="flight__title">
                {this.getLocaleProp('ui_caption_next_event', true)}
              </div>
              <div className="flight__next">
                <TableRow
                  event={nextEvent}
                  locale={nextLocale}
                  refs={this.state.refData}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default withParams(Main);
