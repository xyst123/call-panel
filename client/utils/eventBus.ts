import { get } from '@/utils';
class EventBus {
  singleCallbackEvents: Array<string>;
  events: Common.IObject<any>;
  constructor(props: { singleCallbackEvents?: Array<string> } = {}) {
    this.singleCallbackEvents = get(props, 'singleCallbackEvents', []);
    this.events = {};
  }

  dispatchEvent(event: string, options = []) {
    const callbacks = this.events[event];
    if (Array.isArray(callbacks)) {
      callbacks.forEach((callback: Function) => {
        callback.apply(null, options)
      })
    } else {
      console.error(`没有注册事件${event}`)
    }
  }

  addEventListener(event: string, callback: Function) {
    const callbacks = this.events[event];
    const isArray = Array.isArray(callbacks);
    if ((isArray && this.singleCallbackEvents.includes(event)) || !isArray) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return this.removeEventListener(event, callback);
  }

  removeEventListener(event: string, callback: Function) {
    const callbacks = this.events[event];
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }
}

export default new EventBus({
  singleCallbackEvents: []
});