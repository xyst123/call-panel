const initialState={
  open: false
}
export const toolbar = (
  state = initialState,
  action: Store.IAction
) => {
  switch (action.type) {
    case 'TOOLBAR_SET':
      return {
        ...state,
        open: action.payload
      };
    default:
      return state;
  }
};
