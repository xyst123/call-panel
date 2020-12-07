import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle } from 'react';
// @ts-ignore
import { Input } from 'ppfish';
import { ISeat, ModalType } from '@/constant/phone';
import { getSeats, getTransfers } from '@/service/phone';
import Board from '@/pages/SelectModal/Board';
import { handleRes, get } from '@/utils';
import useGlobal from '@/hooks/global';
import '@/style/Select-Seat.less';

const Seat: React.FC<any> = ({ seat, childRef, onSelect }: {
  seat: ISeat
  childRef: React.RefObject<any>
  onSelect: Function
}) => {
  const handlerMap: {
    [P in ModalType]: Function
  } = {
    intercom: getSeats,
    conference: getSeats,
    transfer: getTransfers
  }
  const [seats, setSeats] = useState<ISeat[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filterSeats, setFilterSeats] = useState<ISeat[]>([]);
  const [loading, setLoading] = useState(false);
  const { global } = useGlobal();
  const type: ModalType = get(global, 'selectModalConfig.type', '');
  const actionText = get(global, 'selectModalConfig.extData.action', '');

  const handleSetSeats = async () => {
    setLoading(true);
    const res = await handlerMap[type]();
    setLoading(false);

    handleRes(res, (data: {
      kefu: ISeat[],
    }) => {
      setSeats(data.kefu);
      setKeyword('');
    }, () => { })
  }

  const reset = () => {
    setKeyword('');
  }

  useImperativeHandle(childRef, () => ({
    reset,
    reload: handleSetSeats
  }));

  useEffect(() => {
    if (keyword) {
      setFilterSeats(seats.filter(seat => seat.realname.toLowerCase().includes(keyword.toLowerCase())))
    } else {
      setFilterSeats(seats)
    }
  }, [seats, keyword])

  useEffect(() => {
    if (keyword) {
      setFilterSeats(seats.filter(seat => seat.realname.toLowerCase().includes(keyword.toLowerCase())))
    } else {
      setFilterSeats(seats)
    }
  }, [seats, keyword])

  useEffect(() => {
    handleSetSeats()
  }, [])

  return <>
    <div className="select-seat">
      <Input value={keyword} placeholder="搜索坐席姓名" size="large" onChange={(event: any) => {
        const string = event.target.value;
        setKeyword(string);
      }} />
      <i className="iconfont icon-search"></i>
    </div>
    <Board type='seat' selected={seat} list={filterSeats} loading={loading} emptyText={keyword ? `未找到与${keyword}相关的可${actionText}客服` : `没有可${actionText}的客服`} onSelect={onSelect} />
  </>
}

export default Seat