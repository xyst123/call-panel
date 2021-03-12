declare module 'ppfish';

interface Window {
  debug: Function,
  CallPanel: any,
  cefQuery: boolean,
  QiyuConnect: any,
  _nativeApi: any,
}

interface Promise {
  abort: (() => void) | null,
}

declare namespace Common {
  interface IRes {
    status: boolean;
    code: number;
    msg: string;
    data?: any;
  }
  interface IObject<T> {
    [key: string]: T;
  }
  interface IValueLabel {
    label: string;
    value: any;
  }
}

declare namespace Store {
  interface IAction {
    type: string;
    payload: any;
  }
  type dispatch = (action: IAction) => void
}

interface RefObject<T> {
  current: T;
}
