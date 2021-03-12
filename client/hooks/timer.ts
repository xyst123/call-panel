import { useState, useEffect, useRef } from 'react';

type timerType = 'timeout' | 'interval';

export default (value: NodeJS.Timeout | null): [() => NodeJS.Timeout | null, React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>, (type?: timerType) => void] => {
	const timerRef = useRef(value);
	const [timer, setTimer] = useState(value);

	useEffect(() => {
		timerRef.current = timer
	}, [timer]);

	return [
		() => timerRef.current,
		setTimer,
		(type: timerType = 'timeout') => {
			if (timerRef.current) {
				if (type === 'interval') {
					clearInterval(timerRef.current)
				} else {
					clearTimeout(timerRef.current)
				}
			};
		}
	]
}