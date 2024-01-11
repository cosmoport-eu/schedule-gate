import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Trapeze from './Trapeze';
import Locale from '../class/Locale';

export default class TableRow extends Component {
  static propTypes = {
    locale: PropTypes.shape({
      ui_months_names: PropTypes.shape({
        id: PropTypes.number,
        values: PropTypes.arrayOf(PropTypes.string),
      }),
    }),
  };

  static defaultProps = {
    locale: {},
  };

  getLocaleProp(prop, uppercase) {
    const property = Locale.getLocaleProp(this.props.locale, prop);

    return uppercase ? property.toUpperCase() : property;
  }

  mapStatus = (statusId) => {
    const map = { 6: 'finish', 4: 'landing', 3: 'cancel', 7: 'pre-order' };

    return map[statusId] ? ` voyage--${map[statusId]}` : '';
  };

  renderIcon = (typeId) => {
    let name = '';

    if (typeId === 2) {
      name = 'i-radar';
    }

    if (typeId === 1) {
      name = 'i-man';
    }

    if (typeId > 2) {
      name = 'i-space-small';
    }

    return <i className={name} />;
  };

  renderDepartion(minutes) {
    const h = Math.trunc(minutes / 60);
    const m = minutes % 60;

    return `${(h < 10 ? '0' : '') + h}:${(m < 10 ? '0' : '') + m}`;
  }

  renderTypeTitle(val, values) {
    let result = val;

    for (const type of values.types) {
      for (const cat of values.type_categories) {
        if (cat.id === type.categoryId) {
          result = `${this.getLocaleProp(cat.i18nEventTypeCategoryName, true)}:`;
          break;
        }
      }
    }

    return result;
  }

  renderTypeName(val, values) {
    let result = val;

    for (const type of values.types) {
      if (val === type.id) {
        result = `${this.getLocaleProp(type.i18nEventTypeName, true)}`;
        break;
      }
    }

    return result;
  }

  renderDestination(val, values) {
    let result = val;

    for (const dest of values.destinations) {
      if (val === dest.id) {
        result = this.getLocaleProp(dest.i18nEventDestinationName, true);
        break;
      }
    }

    return result;
  }

  renderDuration(minutes) {
    let result = minutes;

    const h = Math.trunc(minutes / 60);
    const m = minutes % 60;

    result = `${h} ${this.getLocaleProp(
      'ui_caption_hours',
    )} ${m} ${this.getLocaleProp('ui_caption_minutes')}`;

    return result;
  }

  renderStatus(val, values) {
    let result = val;

    for (const status of values.statuses) {
      if (val === status.id) {
        result = this.getLocaleProp(status.i18nStatus, true);
        break;
      }
    }

    // Don't show status text for all events with id < 2
    const caption = val < 2 ? '' : result;

    return <span>{caption}</span>;
  }

  render() {
    const { event, refs } = this.props;

    return (
      <div
        className={`voyage${this.mapStatus(event.eventStatusId)}`}
        key={event.id}
      >
        <Trapeze />

        <div className="voyage__wrapper">
          <div className="voyage__time">
            {this.renderDepartion(event.startTime)}
          </div>
          <div className="voyage__type">
            <Trapeze />

            <div className="voyage__type-wrap">
              <div className="voyage__type-icon">
                {this.renderIcon(event.eventTypeId)}
              </div>
              <div className="voyage__type-body">
                <div className="voyage__type-miss">
                  {this.renderTypeTitle(event.eventTypeId, refs)}
                </div>
                <div className="voyage__type-title">
                  {this.renderTypeName(event.eventTypeId, refs)}
                </div>
              </div>
            </div>

            <Trapeze position="_right" />
          </div>
          <div className="voyage__direction">
            {this.renderDestination(event.eventDestinationId, refs)}
          </div>
          <div className="voyage__price">
            {event.cost}
            <i className="i-sing voyage__price-icon" />
          </div>
          <div className="voyage__duration">
            {this.renderDuration(event.durationTime)}
          </div>
          <div className="voyage__status">
            {this.renderStatus(event.eventStatusId, refs)}
          </div>
        </div>

        <Trapeze position="_right" />
      </div>
    );
  }
}
