export type Selection = { oracleId: string; printingId: string; language: string; finish: string };
export type SelectionState = { generation: number; revision: number; selected: Selection | null; manual: boolean };
export type RequestToken = { generation: number; revision: number };

export function recognize(state: SelectionState, selection: Selection, generation: number): SelectionState {
  if (generation !== state.generation || state.manual) return state;
  const current = state.selected;
  if (current !== null && current.oracleId === selection.oracleId &&
      current.printingId === selection.printingId && current.language === selection.language &&
      current.finish === selection.finish) return state;
  return { ...state, selected: { ...selection }, revision: state.revision + 1 };
}

export function overrideSelection(state: SelectionState, selection: Selection): SelectionState {
  return { ...state, selected: { ...selection }, manual: true, revision: state.revision + 1 };
}

export function acceptsResponse(state: SelectionState, token: RequestToken): boolean {
  return state.selected !== null && state.generation === token.generation && state.revision === token.revision;
}

export function requestToken(state: SelectionState): RequestToken {
  return { generation: state.generation, revision: state.revision };
}

export function nextScan(state: SelectionState): SelectionState {
  return { generation: state.generation + 1, revision: 0, selected: null, manual: false };
}

export function initialSelection(): SelectionState {
  return { generation: 0, revision: 0, selected: null, manual: false };
}
