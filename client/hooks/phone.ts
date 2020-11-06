import { Dispatch } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {IPhoneStatus,IExtendedPhoneStatus} from '@/constant/phone';



export default ():[IExtendedPhoneStatus,Dispatch<any>] => {
  const phone:IExtendedPhoneStatus = useSelector((state: {
    phone: IPhoneStatus;
  }) => {
    const {phone} = state;
    // 添加通用的衍生属性
    return Object.assign(phone, {
      isBusy: phone.callStatus !== 'empty',
      isRinging: ['callIn', 'callOut', 'joinIn', 'callFail'].includes(phone.callStatus),
    })
  });
  return [phone, useDispatch()]
}