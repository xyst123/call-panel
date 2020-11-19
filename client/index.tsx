import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Routes } from '@/router';
import store from '@/redux/store';
import { get } from '@/utils';
import { setting } from '@/constant/outer';
import { audioRingSound } from '@/constant/element';

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

ReactDOM.render(
  <Provider store={store}>
    <Routes />
  </Provider>,
  document.getElementById('root')
);
