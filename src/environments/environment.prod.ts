export const environment = {
  production: true,
  peerServerOpt: {
    config: {
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ]
        }
      ],
    },
    debug: 3
  }
};
