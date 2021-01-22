import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle } from 'react';
import { Input } from 'ppfish';
import { IGroup, IModalCallbacks } from '@/constant/phone';
import { getTransfers, } from '@/service/phone';
import Board from '@/pages/SelectModal/Board';
import { handleRes, get } from '@/utils';
import useGlobal from '@/hooks/global';
import '@/style/Select-Group.less';

const Group: React.FC<{
  group: IGroup | null
  childRef: React.Ref<IModalCallbacks>
  onSelect: (group: IGroup) => void,
  [key: string]: any;
}> = ({ group, childRef, onSelect, ...props }) => {
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filterGroups, setFilterGroups] = useState<IGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { global } = useGlobal();
  const actionText = get(global, 'selectModalConfig.extData.action', '');

  const handleSetGroups = async () => {
    setLoading(true);
    const res = await getTransfers();
    setLoading(false);

    handleRes(res, (data: {
      group: IGroup[],
    }) => {
      setGroups(data.group);
      setKeyword('');
    }, () => { })
  }

  const reset = () => {
    setKeyword('');
  }

  useImperativeHandle(childRef, () => ({
    reset,
    reload: handleSetGroups
  }));

  useEffect(() => {
    if (keyword) {
      setFilterGroups(groups.filter(group => group.name.toLowerCase().includes(keyword.toLowerCase())))
    } else {
      setFilterGroups(groups)
    }
  }, [groups, keyword])

  useEffect(() => {
    if (keyword) {
      setFilterGroups(groups.filter(group => group.name.toLowerCase().includes(keyword.toLowerCase())))
    } else {
      setFilterGroups(groups)
    }
  }, [groups, keyword])

  useEffect(() => {
    handleSetGroups()
  }, [])

  return <>
    <div className="select-group">
      <Input value={keyword} placeholder="搜索客服组名称" size="large" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        const string = event.target.value;
        setKeyword(string);
      }} />
      <i className="iconfont icon-search"></i>
    </div>
    <Board type='group' selected={group} list={filterGroups} loading={loading} emptyText={keyword ? `未找到与${keyword}相关的可${actionText}客服组` : `没有可${actionText}的客服组`} onSelect={onSelect} />
  </>
}

export default Group