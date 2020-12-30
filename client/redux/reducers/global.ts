import { get, assignState, resetState } from '@/utils';
import { modalMap, ModalType } from '@/constant/phone';
const initialState = {
  isToolBar: false,
  setting: get(window, 'setting', {}),
  modalConfig: {
    visible: false,
    cancelButtonDisabled: false,
    esc: true,
    children: null
  },
  selectModalConfig: {
    visible: false,
    type: '',
    text: '',
    tabs: [],
    handler: Function.prototype,
    extData: {}
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
    case 'GLOBAL_SET_SELECT_MODAL':
      const { type, handler } = action.payload;
      return {
        ...state,
        selectModalConfig: {
          visible: true,
          type,
          ...modalMap[type as ModalType],
          handler,
        }
      }
    default:
      return state;
  }
};
