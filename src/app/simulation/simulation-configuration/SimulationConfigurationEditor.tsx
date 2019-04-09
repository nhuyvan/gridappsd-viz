import * as React from 'react';

import { SimulationConfiguration } from '@shared/simulation';
import { FeederModel } from '@shared/FeederModel';
import { Application } from '@shared/Application';
import { Dialog, DialogContent, DialogActions } from '@shared/dialog';
import { FormGroup, SelectFormControl, FormControl, CheckBox, MultilineFormControl } from '@shared/form';
import { MenuItem } from '@shared/dropdown-menu';
import { SIMULATION_CONFIG_OPTIONS } from './models/simulation-config-options';
import { Tooltip } from '@shared/tooltip';
import { IconButton, BasicButton } from '@shared/buttons';

import './SimulationConfigurationEditor.scss';

interface Props {
  onSubmit: (configObject: SimulationConfiguration) => void;
  onMRIDChanged: (mRID: string, simulationName: string) => void;
  onClose: (event) => void;
  initialConfig: SimulationConfiguration;
  feederModels: FeederModel;
  availableApplications: Application[];
}

interface State {
  show: boolean;
  applicationConfigStr: string;
  simulationName: string;
  noLineNameMessage: boolean;
}

export class SimulationConfigurationEditor extends React.Component<Props, State> {

  private _currentConfig: SimulationConfiguration;

  constructor(props: Props) {
    super(props);
    this.state = {
      show: true,
      applicationConfigStr: '',
      simulationName: props.initialConfig.simulation_config.simulation_name,
      noLineNameMessage: false
    };
    this._currentConfig = this._cloneConfigObject(props.initialConfig);
  }

  private _cloneConfigObject(original: SimulationConfiguration): SimulationConfiguration {
    const config = {} as SimulationConfiguration;
    config.power_system_config = { ...original.power_system_config };
    config.application_config = {
      applications: original.application_config.applications.length > 0 ?
        [{ ...original.application_config.applications[0] }] : []
    };
    config.simulation_config = { ...original.simulation_config };
    return config;
  }

  render() {
    return (
      <Dialog show={this.state.show}>
        <DialogContent>
          <form>
            <FormGroup label='Power System Configuration'>
              <SelectFormControl
                label='Geographical region name'
                menuItems={this.props.feederModels.regions.map(region => new MenuItem(region.regionName, region.regionID))}
                defaultSelectedIndex={
                  (this.props.feederModels.regions
                    .filter(region => region.regionID === this._currentConfig.power_system_config.GeographicalRegion_name)[0] || { index: 0 }).index
                }
                onChange={item => this._currentConfig.power_system_config.GeographicalRegion_name = item.value} />

              <SelectFormControl
                label='Sub-geographical region name'
                menuItems={
                  this.props.feederModels.subregions.map(subregion => new MenuItem(subregion.subregionName, subregion.subregionID))
                }
                defaultSelectedIndex={
                  (this.props.feederModels.subregions
                    .filter(subregion => subregion.subregionID === this._currentConfig.power_system_config.SubGeographicalRegion_name)[0] || { index: 0 }).index
                }
                onChange={item => this._currentConfig.power_system_config.SubGeographicalRegion_name = item.value} />

              <SelectFormControl
                label='Line name'
                menuItems={this.props.feederModels.lines.map(line => new MenuItem(line.name, line))}
                onChange={item => {
                  this._currentConfig.power_system_config.Line_name = item.value.mRID;
                  this._currentConfig.simulation_config.simulation_name = item.value.name;
                  this.setState({ simulationName: item.value.name, noLineNameMessage: false });
                  this.props.onMRIDChanged(item.value.mRID, this._currentConfig.simulation_config.simulation_name);
                }} />
            </FormGroup>

            <FormGroup label='Simulation Configuration'>
              <FormControl
                label='Start time'
                hint='YYYY-MM-DD HH:MM:SS'
                name='start_time'
                value={this._currentConfig.simulation_config.start_time}
                onChange={value => this._currentConfig.simulation_config.start_time = value}
              />
              <FormControl
                label='Duration'
                hint='Seconds'
                type='number'
                name='duration'
                value={this._currentConfig.simulation_config.duration}
                onChange={value => this._currentConfig.simulation_config.duration = value}
              />
              <div style={{ position: 'relative' }}>
                <SelectFormControl
                  label='Simulator'
                  menuItems={SIMULATION_CONFIG_OPTIONS.simulation_config.simulators.map(e => new MenuItem(e, e))}
                  onChange={item => this._currentConfig.simulation_config.simulator = item.value}
                  defaultSelectedIndex={
                    SIMULATION_CONFIG_OPTIONS.simulation_config.simulators
                      .indexOf(this._currentConfig.simulation_config.simulator)
                  } />
                <div style={{ position: 'absolute', top: 0, left: '48%', fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold' }}>Power flow solver method</div>
                  <div>NR</div>
                </div>
              </div>
              <div className='realtime-checkbox-container'>
                <CheckBox
                  label='Real time'
                  name='realtime'
                  checked={this._currentConfig.simulation_config.run_realtime}
                  onChange={state => this._currentConfig.simulation_config.run_realtime = state} />
                <Tooltip
                  position='right'
                  content={
                    <>
                      <div>Checked: Run in real time. Slower than simulation time</div>
                      <div>Unchecked: Run in simulation time. Faster than real time</div>
                    </>
                  }>
                  <IconButton icon='question' />
                </Tooltip>
              </div>

              <FormControl
                label='Simulation name'
                name='simulation_name'
                value={this.state.simulationName}
                onChange={value => this._currentConfig.simulation_config.simulation_name = value} />

              <MultilineFormControl
                label='Model creation configuration'
                value={JSON.stringify(this._currentConfig.simulation_config.model_creation_config, null, 4)}
                onUpdate={value => this._currentConfig.simulation_config.model_creation_config = JSON.parse(value)} />
            </FormGroup>

            {
              this.props.availableApplications.length > 0 &&
              <FormGroup label='Application Configuration'>
                <SelectFormControl
                  label='Application name'
                  menuItems={this.props.availableApplications.map(app => new MenuItem(app.id, app.id))}
                  onChange={menuItem => {
                    const currentApp = this._currentConfig.application_config.applications.pop() || { name: menuItem.value, config_string: '' };
                    this._currentConfig.application_config.applications.push(currentApp);
                  }}
                  defaultSelectedIndex={
                    this._currentConfig.application_config.applications.length === 0
                      ? undefined
                      : this.props.availableApplications
                        .findIndex(app => app.id === this._currentConfig.application_config.applications[0].name)
                  } />
                <MultilineFormControl
                  label='Application configuration'
                  value={
                    this._currentConfig.application_config.applications.length === 0
                      ? ''
                      : this._currentConfig.application_config.applications[0].config_string === ''
                        ? ''
                        : JSON.stringify(this._currentConfig.application_config.applications[0].config_string, null, 4)
                  }
                  onUpdate={value => this._currentConfig.application_config.applications[0].config_string = value} />
              </FormGroup>
            }
          </form>
        </DialogContent>
        <DialogActions>
          <BasicButton
            label='Cancel'
            type='negative'
            onClick={event => {
              event.stopPropagation();
              this.props.onClose(event);
              this.setState({ show: false });
            }} />
          <BasicButton
            label='Submit'
            type='positive'
            onClick={event => {
              if (this._currentConfig.power_system_config.Line_name === '') {
                console.log("No model selected");
                this.setState({ noLineNameMessage: true });
              }
              else {
                event.stopPropagation();
                this.setState({ show: false });
                this.props.onSubmit(this._currentConfig);
              }
            }} />
          {this.state.noLineNameMessage &&
            <span style={{ color: 'red' }} >&nbsp; Please select a Line Name </span>}
        </DialogActions>
      </Dialog >
    );
  }

}