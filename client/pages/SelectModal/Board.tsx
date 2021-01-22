import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Icon } from 'ppfish';
import { ISeat, IGroup } from '@/constant/phone';
import '@/style/Select-Board.less';

const typeMap = {
  seat: {
    nameProp: 'realname',
    icon: 'icon-avatar',
    textMaxWidth: 100
  },
  group: {
    nameProp: 'name',
    icon: 'icon-avatarGroup',
    textMaxWidth: 86
  }
}

const Board: React.FC<{
  type: keyof typeof typeMap,
  selected: ISeat | IGroup | null,
  list: ISeat[] | IGroup[],
  loading: boolean,
  emptyText: string,
  onSelect: Function
  [key: string]: any;
}> = ({ type, selected, list, loading, emptyText, onSelect, ...props }) => {
  if (loading) return <div className="select-board" {...props}><Icon type="load-line" spinning={true} /></div>;

  if (list.length) {
    return <div className="select-board" {...props}>
      <ul>
        {
          ((list as any[])).map(item => {
            const { nameProp, icon, textMaxWidth } = typeMap[type];
            return (
              <li key={item.id} className={item.id === (selected || {}).id ? 'item_selected' : `${item._intercomStatusClassName}`} onClick={onSelect.bind(null, item)}>
                <i className={`iconfont ${icon}`}></i>
                <span className="select-board-text" style={{ maxWidth: `${textMaxWidth}px` }} >{item[nameProp]}</span>
                {type === 'group' && item.status === 1 ? <span>{`(${item.number})`}</span> : null}
                <i className={`iconfont ${item._intercomIconClassName}`}></i>
              </li>
            )
          })
        }
      </ul>
    </div >
  }

  return <p className="select-text" {...props}>
    <i className="iconfont icon-tishixinxi"></i>
    <span>{emptyText}</span>
  </p>
}

export default Board