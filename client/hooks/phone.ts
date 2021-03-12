import { useSelector } from 'react-redux';
import { IPhone, IExtendedPhone } from '@/constant/phone';

// 添加通用的衍生属性
export const enhancePhone = (phone: IPhone): IExtendedPhone => Object.assign(phone, {
  isBusy: phone.callStatus !== 'empty',
  isRinging: ['callIn', 'callOut', 'joinIn'].includes(phone.callStatus),
  canCallOut: [1, 5, 6].includes(phone.status) // 可外呼状态
});

export default (): {
  phone: IExtendedPhone
} => {
  const phone: IExtendedPhone = useSelector((state: {
    phone: IPhone;
  }) => {
    const { phone } = state;
    return enhancePhone(phone)
  });

  return { phone };
}