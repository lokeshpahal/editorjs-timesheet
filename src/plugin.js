import Table from './table';
import clockIcon from './img/clock.svg';
import withHeadings from './img/with-headings.svg';
import withoutHeadings from './img/without-headings.svg';
import * as $ from './utils/dom';
import * as utils from './utils/timesheet';

/**
 * @typedef {object} TableConfig - configuration that the user can set for the table
 * @property {number} rows - number of rows in the table
 * @property {number} cols - number of columns in the table
 */
/**
 * @typedef {object} Tune - setting for the table
 * @property {string} name - tune name
 * @property {HTMLElement} icon - icon for the tune
 * @property {boolean} isActive - default state of the tune
 * @property {void} setTune - set tune state to the table data
 */
/**
 * @typedef {object} TableData - object with the data transferred to form a table
 * @property {boolean} withHeading - setting to use cells of the first row as headings
 * @property {string[][]} content - two-dimensional array which contains table content
 */

/**
 * Table block for Editor.js
 */
export default class TimesheetBlock {
  /**
   * Notify core that read-only mode is supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Allow to press Enter inside the CodeTool textarea
   *
   * @returns {boolean}
   * @public
   */
  static get enableLineBreaks() {
    return true;
  }

  /**
   * Render plugin`s main Element and fill it with saved data
   *
   * @param {TableData} data — previously saved data
   * @param {TableConfig} config - user config for Tool
   * @param {object} api - Editor.js API
   * @param {boolean} readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      withHeadings: data && data.withHeadings ? data.withHeadings : false,
      content: data && data.content ? data.content : [],
      snippet: data && data.snippet ? data.snippet : null
    };
    this.config = config;
    this.placeholder = this.config.placeholder || 'Timesheet Snippet';
    this.table = null;
    this.regex = config.regex;
    this.nodes = {
      wrapper: null,
      container: null,
      inputHolder: null,
      buttonLinkHolder: null,
      textInput: null,
      tableHolder: null,
      tableContentHolder: null,
      loadingHolder: null
    }
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: clockIcon,
      title: 'Timesheet'
    };
  }

  /**
   * Plugins styles
   *
   * @returns {{settingsWrapper: string}}
   */
  get CSS() {
    return {
      settingsWrapper: 'tc-settings',
      baseClass: this.api.styles.block,
      hide: "hide",
      btn: "cdx-btn",
      container: "timesheetContainer",
      input: "timesheetContainer__input",
      inputHolder: "timesheetContainer__inputHolder",
      inputText: "timesheetContainer__input--text",
      buttonLinkHolder: "timesheetContainer__buttonLinkHolder",
      tableHolder: "timesheetContainer-tableHolder",
      loadingHolder: 'timesheetContainer__preloader',
      loadingContent: 'timesheetContainer__preloader-content',
    };
  }

  static get STATE() {
    return {
      EDIT:0,
      VIEW:1,
      LOADING:2
    };
  }

  static prepare({ config = {} }) {
    TimesheetBlock.patterns = config.regex ? {
      timesheet: config.regex
    } : {}
  }

  /**
   * Return Tool's view
   *
   * @returns {HTMLDivElement}
   */
  render() {
    /** creating table */
    this.table = new Table(this.readOnly, this.api, this.data, this.config);

    this.nodes.tableHolder = $.make('div', [this.CSS.hide, this.CSS.tableHolder]);
    this.nodes.wrapper = $.make('div', this.CSS.baseClass);
    this.nodes.container = $.make('div', this.CSS.container);

    this.nodes.loadingHolder = this.createPreloader();
    this.nodes.inputHolder = this.makeInputHolder();

    this.nodes.container.appendChild(this.nodes.inputHolder);
    this.nodes.container.appendChild(this.nodes.loadingHolder);

    this.nodes.tableContentHolder = this.table.getWrapper();
    this.nodes.tableHolder.appendChild(this.nodes.tableContentHolder);

    this.nodes.container.appendChild(this.nodes.tableHolder);
    this.table.setHeadingsSetting(this.data.withHeadings);

    this.nodes.wrapper.appendChild(this.nodes.container);

    if (this.data.snippet) {
      this.show(TimesheetBlock.STATE.VIEW)
    }
    return this.nodes.wrapper;
  }

  renderSettings() {
    const wrapper = $.make('div', this.CSS.settingsWrapper);

    const tunes = [ {
      name: this.api.i18n.t('With headings'),
      icon: withHeadings,
      isActive: this.data.withHeadings,
      setTune: () => {
        this.data.withHeadings = true;
      }
    }, {
      name: this.api.i18n.t('Without headings'),
      icon: withoutHeadings,
      isActive: !this.data.withHeadings,
      setTune: () => {
        this.data.withHeadings = false;
      }
    } ];

    tunes.forEach((tune) => {
      let tuneButton = $.make('div', this.api.styles.settingsButton);

      if (tune.isActive) {
        tuneButton.classList.add(this.api.styles.settingsButtonActive);
      }

      tuneButton.innerHTML = tune.icon;
      tuneButton.addEventListener('click', () => this.toggleTune(tune, tuneButton));

      this.api.tooltip.onHover(tuneButton, tune.name, {
        placement: 'top',
        hidingDelay: 500
      });

      wrapper.append(tuneButton);
    });

    return wrapper;
  }

  save() {
    const tableContent = this.table.getData();

    let result = {
      withHeadings: this.data.withHeadings,
      content: tableContent,
      snippet: this.data.snippet
    };

    return result;
  }

  toggleTune(tune, tuneButton) {
    const buttons = tuneButton.parentNode.querySelectorAll('.' + this.api.styles.settingsButton);

    // Clear other buttons
    Array.from(buttons).forEach((button) =>
      button.classList.remove(this.api.styles.settingsButtonActive)
    );

    // Mark active button
    tuneButton.classList.toggle(this.api.styles.settingsButtonActive);
    tune.setTune();

    this.table.setHeadingsSetting(this.data.withHeadings);
  }

  makeInputHolder() {
    const inputHolder = $.make('div', [this.CSS.inputHolder]);
    this.nodes.textInput = $.make('div', [this.api.styles.input, this.CSS.input, this.CSS.inputText], {
      contentEditable: !this.readOnly,
    });
    this.nodes.textInput.dataset.placeholder = this.api.i18n.t(this.placeholder);

    this.nodes.textInput.addEventListener('input', (event) => {
      if (this.regex.test(this.nodes.textInput.textContent)) {
        this.data.snippet = this.nodes.textInput.textContent;
        this.show(TimesheetBlock.STATE.LOADING);
        this.loadData(this.data.snippet);
      }
    });

    inputHolder.appendChild(this.nodes.textInput);
    return inputHolder;
  }

  createPreloader() {
    const preloader = $.make('preloader', [this.CSS.hide, this.CSS.loadingHolder]);
    const url = $.make('div', [this.CSS.loadingContent]);
    url.textContent = 'loading...';
    preloader.appendChild(url);
    return preloader;
  }

  show(state) {
    this.changeState(state);
  }

  loadData(url) {
    fetch(url, {
      method: 'GET',
      headers: this.config.additionalRequestHeaders
    }).then(res => res.json())
    .then(response => this.embedTable(response))
    .catch(error => console.error('Error:', error));
  }

  prepareTableData(response) {
    let data = [
      ['Work Details', 'Billable time', 'Note', 'Billing (/hr)', 'Total Billing']
    ];

    for (let entry of response.entries) {
      let entryBill = entry.minutes_spent * (response.per_hour / 60);
      entryBill = Math.round(entryBill * 100) / 100;

      data.push([
        entry.story_name, utils.minutesToLabel(entry.minutes_spent), entry.notes, '$'+response.per_hour, '$'+entryBill
      ]);
    }
    const totalMins = response.entries.reduce((accumulator, entry) => {
      return accumulator + entry.minutes_spent;
    }, 0);

    let totalBill = totalMins * (response.per_hour / 60);
    totalBill = Math.round(totalBill * 100) / 100;

    data.push([
      '<b>Total</b>', '<b>'+utils.minutesToLabel(totalMins)+'</b>', '', '', '<b>$'+totalBill+'</b>'
    ]);

    return data;
  }

  embedTable(data) {
    const index = this.api.blocks.getCurrentBlockIndex();
    const tableData = this.prepareTableData(data);
    this.data.content = tableData;
    this.data.withHeadings = true;

    this.table = new Table(this.readOnly, this.api, this.data, this.config);
    this.nodes.tableHolder.removeChild(this.nodes.tableContentHolder);
    this.nodes.tableContentHolder = this.table.getWrapper();
    this.nodes.tableHolder.appendChild(this.nodes.tableContentHolder)

    this.show(TimesheetBlock.STATE.VIEW);
  }

  changeState(state){
    switch (state) {
      case TimesheetBlock.STATE.EDIT:
        this.nodes.inputHolder.classList.remove(this.CSS.hide);
        this.nodes.tableHolder.classList.add(this.CSS.hide);
        this.nodes.loadingHolder.classList.add(this.CSS.hide);
        break;
      case TimesheetBlock.STATE.VIEW:
        this.nodes.tableHolder.classList.remove(this.CSS.hide);
        this.nodes.inputHolder.classList.add(this.CSS.hide);
        this.nodes.loadingHolder.classList.add(this.CSS.hide);
        break;
      case TimesheetBlock.STATE.LOADING:
        this.nodes.loadingHolder.classList.remove(this.CSS.hide);
        this.nodes.tableHolder.classList.add(this.CSS.hide);
        this.nodes.inputHolder.classList.add(this.CSS.hide);
        break;
    }
  }

  onPaste(event) {
    switch (event.type){
      case 'pattern':
        this.loadData(event.detail.data);
        break;
    }
  }

  static get pasteConfig() {
    return {
      patterns: TimesheetBlock.patterns,
    };
  }

  /**
   * Plugin destroyer
   *
   * @returns {void}
   */
  destroy() {
    this.table.destroy();
  }
}
