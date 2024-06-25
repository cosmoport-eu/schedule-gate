import React, { Component } from 'react';

import Trapeze from './Trapeze';
import Locale from '../class/Locale';

export default class TableHeader extends Component {
  getUiName(name) {
    const { locale } = this.props;

    return (
      <span key={Locale.getLocaleProp(name, locale)}>
        {Locale.getLocaleProp(name, locale)}
      </span>
    );
  }

  render() {
    return (
      <div className="voyage head">
        <Trapeze />
        <div className="voyage__wrapper">
          <div className="voyage__time">
            {this.getUiName('ui_caption_departing')}
          </div>
          <div className="voyage__type">
            <Trapeze />

            <div className="voyage__type-wrap">
              <div className="voyage__type-icon">
              </div>
              <div className="voyage__type-body">
                <div className="voyage__type-miss">
                  {this.getUiName('ui_caption_type')}
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
                  <span>Name</span>
                  {/* {this.getUiName('ui_caption_subtype')} */}
                </div>
              </div>
            </div>

            <Trapeze position="_right" />
          </div>
          <div className="voyage__duration">
          {this.getUiName('ui_caption_duration')}
          </div>
          <div className="voyage__limit">
              <span>Limit</span>
          </div>
          <div className="voyage__status">
            {this.getUiName('ui_caption_status')}
          </div>
        </div>

        <Trapeze position="_right" />
      </div>
    );
  }
}
