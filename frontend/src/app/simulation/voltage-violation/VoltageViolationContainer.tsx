import * as React from 'react';
import { zip, Subject } from 'rxjs';
import { switchMap, filter, takeWhile, takeUntil } from 'rxjs/operators';

import { VoltageViolation } from './VoltageViolation';
import { StompClientService } from '@shared/StompClientService';
import { StateStore } from '@shared/state-store';
import { SimulationManagementService } from '@shared/simulation';
import { SimulationStatus } from '@common/SimulationStatus';
import { DateTimeService } from '@shared/DateTimeService';

interface Props {
}

interface State {
  totalVoltageViolations: number;
  violationsAtZero: number;
  voltageViolationTimestamp: string;
}

export class VoltageViolationContainer extends React.Component<Props, State> {

  private readonly _stompClientService = StompClientService.getInstance();
  private readonly _simulationManagementService = SimulationManagementService.getInstance();
  private readonly _dateTimeService = DateTimeService.getInstance();
  private readonly _stateStore = StateStore.getInstance();
  private readonly _unsubscriber = new Subject<void>();

  constructor(props: Props) {
    super(props);

    this.state = {
      totalVoltageViolations: -1,
      violationsAtZero: 0,
      voltageViolationTimestamp: ''
    };
  }

  componentDidMount() {
    this._observeVoltageViolationChanges();
    this._readViolationsOnSimulationSnapshotReceived();
    this._clearAllViolationCountsWhenSimulationStarts();
  }

  private _observeVoltageViolationChanges() {
    return this._stateStore.select('simulationId')
      .pipe(
        filter(id => id !== '' && this._simulationManagementService.didUserStartActiveSimulation()),
        switchMap(id => this._stompClientService.readFrom<{ [mrid: string]: number }>(`/topic/goss.gridappsd.simulation.voltage_violation.${id}.output`)),
        takeWhile(this._simulationManagementService.isUserInActiveSimulation),
        takeUntil(this._unsubscriber)
      )
      .subscribe({
        next: payload => {
          const violatingValues = Object.values(payload);
          const violationsAtZero = violatingValues.filter(value => value === 0).length;
          const state = {
            totalVoltageViolations: violatingValues.length,
            violationsAtZero,
            voltageViolationTimestamp: this._dateTimeService.format(this._simulationManagementService.getOutputTimestamp())
          };
          this.setState(state);
          this._simulationManagementService.syncSimulationSnapshotState(state);
        }
      });
  }

  private _readViolationsOnSimulationSnapshotReceived() {
    return zip(
      this._simulationManagementService.selectSimulationSnapshotState('totalVoltageViolations'),
      this._simulationManagementService.selectSimulationSnapshotState('violationsAtZero'),
      this._simulationManagementService.selectSimulationSnapshotState('voltageViolationTimestamp')
    )
      .pipe(
        filter(this._simulationManagementService.isUserInActiveSimulation),
        takeUntil(this._unsubscriber)
      )
      .subscribe({
        next: tuple => {
          this.setState({
            totalVoltageViolations: tuple[0],
            violationsAtZero: tuple[1],
            voltageViolationTimestamp: tuple[2]
          });
        }
      });
  }

  private _clearAllViolationCountsWhenSimulationStarts() {
    this._simulationManagementService.simulationStatusChanges()
      .pipe(
        takeUntil(this._unsubscriber),
        filter(status => status === SimulationStatus.STARTING && this._simulationManagementService.didUserStartActiveSimulation())
      )
      .subscribe({
        next: () => {
          const newStates = {
            totalVoltageViolations: -1,
            violationsAtZero: -1,
            voltageViolationTimestamp: ''
          };
          this.setState(newStates);
          this._simulationManagementService.syncSimulationSnapshotState(newStates);
        }
      });
  }

  componentWillUnmount() {
    this._unsubscriber.next();
    this._unsubscriber.complete();
  }

  render() {
    return (
      this.state.totalVoltageViolations !== -1
      &&
      <VoltageViolation
        timestamp={this.state.voltageViolationTimestamp}
        totalVoltageViolations={this.state.totalVoltageViolations}
        numberOfViolationsAtZero={this.state.violationsAtZero} />
    );
  }

}
