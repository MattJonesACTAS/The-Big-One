// Build: 20260526-110611
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Treatment {
  name: string;
  elapsed: number;
  round: number;
  clock: string;
  clockSeconds: string;
  prior?: boolean;
}

export interface AppState {
  running: boolean;
  startTime: number | null;
  pausedTime: number;
  elapsedSeconds: number;
  rhythmCheckTarget: number;
  rhythmCheckPaused: boolean;
  rhythmCheckOvertime: number;
  frozenCountdown?: number;
  cprRound: number;
  shocks: number;
  treatments: Treatment[];
  currentOverlay: string | null;
  catchupElapsed: number;
  startClockTime: number | null;
  patientWeight: number | null;
  patientType: 'adult' | 'paed' | null;
  reversiblesChecked: string[];
  roscChecked: string[];
  pheaChecked: string[];
}

export type OverlayType = 'reversibles' | 'rosc' | 'phea' | 'summary' | 'treatment' | 'caseSummary' | 'tutorial';
