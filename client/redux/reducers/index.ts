import { combineReducers } from 'redux';
import { phone } from './phone';
import { toolbar } from './toolbar';
import { global } from './global';

export default combineReducers({ phone, toolbar, global });
