import { useSelector, useDispatch } from 'react-redux';
export default () => {
  const global: any = useSelector((state: {
    global: any;
  }) => {
    const { global } = state;
    // 添加通用的衍生属性
    return Object.assign(global, {})
  });

  return { global }
}