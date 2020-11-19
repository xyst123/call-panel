import { get, assignState, resetState } from '@/utils';
const initialState = {
  modalConfig: {
    visible: false,
    cancelButtonDisabled: false,
    esc: true,
    children: null
  },
}
export const global = (
  state = initialState,
  action: Store.IAction
) => {
  switch (action.type) {
    case 'GLOBAL_SET':
      return assignState(action.payload, state);
    case 'GLOBAL_RESET':
      return resetState(action.payload, state, initialState);
    default:
      return state;
  }
};
