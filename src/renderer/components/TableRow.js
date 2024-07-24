import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Trapeze from './Trapeze';
import Locale from '../class/Locale';

export default class TableRow extends Component {
  static propTypes = {
    locale: PropTypes.shape({
      ui_months_names: PropTypes.string
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

  renderTypeTitle(val, refs) {
    const type = refs.types.filter((t) => t.id === val);
    const category = refs.typeCategories.filter((c) => c.id === type[0].categoryId);

    return this.props.locale[category[0].code];
  }

  renderTypeName(val, refData) {
    let typeData = refData.types.find((t) => t.id === val);

    if (typeData.parentId !== null) {
      const parentData = refData.types.find((t) => t.id === typeData.parentId);

      typeData = parentData;
    }

    return typeData
      ? this.props.locale[typeData.nameCode]
      : val;
  }

  renderSubtypeName(val, refData) {
    const typeData = refData.types.find((t) => t.id === val);

    if (typeData.parentId !== null) {
      return typeData
        ? this.props.locale[typeData.nameCode]
        : val;
    }

    return '';
  }

  renderDuration(minutes) {
    let result = minutes;

    const h = Math.trunc(minutes / 60);
    const m = minutes % 60;

    result = `${h} ${this.props.locale.ui_caption_hours} ${m} ${this.props.locale.ui_caption_minutes}`;

    return result;
  }

  renderStatus(val, refData) {
    if (val < 2) {
      return 'Waiting...';
    }

    let result = val;

    const status = refData.statuses.filter((s) => s.id === val);

    result = this.props.locale[status[0].code];

    return <span>{result}</span>;
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
            #{event.id} {this.renderDepartion(event.startTime)}
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
              </div>
            </div>

            <Trapeze position="_right" />
          </div>

          <div className="voyage__subtype">
            <Trapeze />

            <div className="voyage__subtype-wrap">
              <div className="voyage__subtype-body">
                <div className="voyage__subtype-miss">
                  {this.renderTypeName(event.eventTypeId, refs)}
                </div>
                <div className="voyage__subtype-title">
                  {this.renderSubtypeName(event.eventTypeId, refs)}
                </div>
              </div>
            </div>

            <Trapeze position="_right" />
          </div>
          <div className="voyage__duration">
            {this.renderDuration(event.durationTime)}
          </div>
          <div className="voyage__limit">
              {event.peopleLimit}
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
