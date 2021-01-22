interface HTMLAudioElementExtended extends HTMLAudioElement {
  hangupFrom: number
}

export const audioConnectSound = document.querySelector('#call-connected-sound') as HTMLAudioElementExtended;

export const audioHangupSound = document.querySelector('#call-hangup-sound') as HTMLAudioElementExtended;

export const audioRingSound = document.querySelector('#call-ring-sound') as HTMLAudioElementExtended;