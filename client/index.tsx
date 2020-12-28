import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Routes } from '@/router';
import store from '@/redux/store';
import { get } from '@/utils';
import { setting } from '@/constant/outer';
import { audioRingSound } from '@/constant/element';
import {handleCallOut, handleIntercomCallOut, handleCallTask, startSetStatus, handleConference, handleTransfer, phoneReset } from '@/hooks/phone';

import '@/style/reset.less';
import '@/style/index.less';
import '@/style/iconfont.less';

// function requestPermission() {
//   return new Promise((resolve, reject) => {
//     const permissionPromise = Notification.requestPermission((result) => {
//       resolve(result);
//     });
//     if (permissionPromise) {
//       permissionPromise.then(resolve, reject);
//     }
//   }).then((result) => {
//     if (result !== 'granted') {
//       throw new Error('用户拒绝接收通知');
//     }
//   });
// }

// const { serviceWorker } = window.navigator;

// if (
//   (window.location.protocol === 'https:' ||
//     window.location.hostname === 'localhost') &&
//   serviceWorker
// ) {
//   serviceWorker
//     .register('/serviceWorker.js')
//     .then((registration) => {
//       requestPermission();
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// }

// @ts-ignore
window.debug = (type: string, ...args) => {
  return () => {

  }
}

audioRingSound.src = get(setting, 'user.call.ringUrl', '');

const {getState,dispatch}=store;

const component= <Provider store={store}>
  <Routes />
</Provider>

export const sendCall=(params?:Common.IObject<any>)=>{
  handleCallOut(getState().phone,dispatch)(params)
}

export default component;

class CallPanel{
  constructor({root,setting={}}:{root:string,setting?:Common.IObject<any>}){
    ReactDOM.render(
      component,
      document.getElementById(root)
    );

    this.setSetting(setting);

    window.addEventListener('message',(event:MessageEvent)=>{
      const {method, params} = event.data;
      switch (method){
        case 'setSetting':
          this.setSetting(params)
          break;
        case 'setDisplay':
          this.setDisplay(params)
          break;
        case 'sendCall':
          this.sendCall(params)
          break;
        default:
      }
    })
  }

  setSetting(setting?:Common.IObject<any>){
    if(setting){
      dispatch({
        type: 'GLOBAL_SET',
        payload: {setting}
      })
    }
  }

  setDisplay(display:boolean){
    dispatch({
      type: 'PHONE_SET',
      payload: {display}
    })
  }

  sendCall(params?:Common.IObject<any>){
    sendCall(params)
  }
}

(window as any).CallPanel=CallPanel;


