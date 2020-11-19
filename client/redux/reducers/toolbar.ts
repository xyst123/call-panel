import { get, assignState } from '@/utils';
const initialState = {
  open: false
}
export const toolbar = (
  state = initialState,
  action: Store.IAction
) => {
  switch (action.type) {
    case 'TOOLBAR_SET':
      return assignState(action.payload, state);
    default:
      return state;
  }
};
