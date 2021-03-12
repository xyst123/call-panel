interface HTMLAudioElementExtended extends HTMLAudioElement {
  hangUpFrom?: number,
  _playing: boolean,
  _play: () => Promise<void>,
  _stop: () => void
}

const handleAudio = (audio: HTMLAudioElementExtended) => {
  audio._play = audio.play;
  audio._stop = () => {
    audio.pause();
    audio.currentTime = 0
  }
  audio.addEventListener('play', () => {
    audio._playing = true;
  })
  audio.addEventListener('pause', () => {
    audio._playing = false;
  })
  audio.addEventListener('ended', () => {
    audio._playing = false
  })
  return audio;
}

const getAudioElement = (id: string) => handleAudio(document.querySelector(`#${id}`) as HTMLAudioElementExtended)

export const audioConnectSound = getAudioElement('call-connected-sound');

export const audioHangupSound = getAudioElement('call-hangup-sound');

export const audioRingSound = getAudioElement('call-ring-sound');

export const notificationSound = getAudioElement('notification-sound');
