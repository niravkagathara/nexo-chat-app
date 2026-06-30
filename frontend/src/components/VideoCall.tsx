'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Video, Monitor, MonitorOff, User, Minimize2, Maximize2, UserPlus, RefreshCw, Volume2 } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomId: number;
  currentUser: { id: number; name: string; avatarUrl: string | null };
  onClose: () => void;
  isIncoming?: boolean;
  incomingOfferSignal?: any;
  callType?: 'video' | 'voice';
  autoAccept?: boolean;
  isRejoining?: boolean;
  allUsers?: any[];
  onInviteUser?: (userId: number) => void;
}

interface PeerStream {
  userId: number;
  userName: string;
  stream: MediaStream;
}

const VoiceWaveVisualizer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let gainNode: GainNode | null = null;
    let animationId: number;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      
      source = audioCtx.createMediaStreamSource(stream);
      
      // Chrome workaround for remote WebRTC stream:
      // Connect to a GainNode with value 0, and connect that node to destination.
      // This forces the audio graph to pull data from the remote WebRTC stream.
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resume context if suspended (Browser autoplay policy)
      const resume = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };
      resume();
      window.addEventListener('click', resume);
      window.addEventListener('keydown', resume);

      const draw = () => {
        animationId = requestAnimationFrame(draw);
        if (!canvas || !ctx || !analyser) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i] / 255.0;
          barHeight = value * height * 0.85;

          if (barHeight < 3) {
            barHeight = 3 + Math.sin(Date.now() / 150 + i) * 1.5;
          }

          const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
          gradient.addColorStop(0, '#818cf8');
          gradient.addColorStop(0.5, '#4f46e5');
          gradient.addColorStop(1, '#818cf8');

          ctx.fillStyle = gradient;
          const y = height / 2 - barHeight / 2;
          
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - 2, barHeight, 3);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth - 2, barHeight);
          }

          x += barWidth;
        }
      };

      draw();

      return () => {
        window.removeEventListener('click', resume);
        window.removeEventListener('keydown', resume);
        if (animationId) cancelAnimationFrame(animationId);
        if (source) source.disconnect();
        if (gainNode) gainNode.disconnect();
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
      };
    } catch (err) {
      console.warn('AudioContext visualization failed:', err);
    }
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      className="w-[120px] h-[40px] opacity-90 mt-2 bg-indigo-950/20 rounded-full px-2"
    />
  );
};


interface RemoteAudioProps {
  stream: MediaStream;
}

const RemoteAudio: React.FC<RemoteAudioProps> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay />;
};

interface RemoteVideoProps {
  stream: MediaStream;
  muted?: boolean;
  className?: string;
  playsInline?: boolean;
}

const RemoteVideo: React.FC<RemoteVideoProps> = ({
  stream,
  muted = true,
  className,
  playsInline = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline={playsInline}
      muted={muted}
      className={className}
    />
  );
};


export const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  roomId,
  currentUser,
  onClose,
  isIncoming = false,
  incomingOfferSignal: initialIncomingOfferSignal = null,
  callType: initialCallType = 'video',
  autoAccept = false,
  isRejoining = false,
  allUsers = [],
  onInviteUser,
}) => {
  const [incomingOfferSignal, setIncomingOfferSignal] = useState<any>(initialIncomingOfferSignal);
  const [callType, setCallType] = useState<'video' | 'voice'>(initialCallType);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<PeerStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialCallType === 'voice');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('Initializing...');
  const [isCallAccepted, setIsCallAccepted] = useState(autoAccept || !isIncoming);

  // Camera Switching States
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string>('');

  // Speakerphone Toggle State
  const [useLoudspeaker, setUseLoudspeaker] = useState(true);

  useEffect(() => {
    if (initialIncomingOfferSignal) {
      setIncomingOfferSignal(initialIncomingOfferSignal);
    }
  }, [initialIncomingOfferSignal]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Map of userId -> RTCPeerConnection
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  // Map of userId -> RTCIceCandidate[] (candidates received before description set)
  const pendingCandidatesRef = useRef<Map<number, RTCIceCandidate[]>>(new Map());

  // Call history tracking refs
  const callStartTimestampRef = useRef<number>(Date.now());
  const callSessionIdRef = useRef<number | null>(null);
  const isCallAcceptedRef = useRef(autoAccept || !isIncoming);
  const ringingTimeoutRef = useRef<any>(null);

  const [remoteVideoMuted, setRemoteVideoMuted] = useState<{ [userId: number]: boolean }>({});
  const [remoteAudioMuted, setRemoteAudioMuted] = useState<{ [userId: number]: boolean }>({});
  const [remoteScreenSharing, setRemoteScreenSharing] = useState<{ [userId: number]: boolean }>({});

  const [isScreenShareMaximized, setIsScreenShareMaximized] = useState(true);

  useEffect(() => {
    const anyoneSharing = isScreenSharing || remotePeers.some(p => remoteScreenSharing[p.userId]);
    if (anyoneSharing) {
      setIsScreenShareMaximized(true);
    }
  }, [isScreenSharing, remotePeers, remoteScreenSharing]);

  const handleSignalingDataRef = useRef<any>(null);

  useEffect(() => {
    handleSignalingDataRef.current = handleSignalingData;
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const dialtoneAudioRef = useRef<AudioContext | null>(null);

  const playDialtone = () => {
    try {
      stopDialtone();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      dialtoneAudioRef.current = audioCtx;

      let isPlaying = true;
      const playTonePattern = () => {
        if (!isPlaying || audioCtx.state === 'closed') return;

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        // Classic US dial ringtone: 440Hz + 480Hz
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.4);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc2.start();
        osc.stop(audioCtx.currentTime + 1.5);
        osc2.stop(audioCtx.currentTime + 1.5);

        setTimeout(() => {
          if (isPlaying) playTonePattern();
        }, 4000);
      };

      playTonePattern();
    } catch (e) {
      console.warn('Dialtone failed:', e);
    }
  };

  const stopDialtone = () => {
    if (dialtoneAudioRef.current) {
      try {
        dialtoneAudioRef.current.close();
      } catch (e) {}
      dialtoneAudioRef.current = null;
    }
  };

  useEffect(() => {
    if (!isIncoming && remotePeers.length === 0 && isCallAccepted && callStatus !== "Can't join") {
      playDialtone();
    } else {
      stopDialtone();
    }
    return () => stopDialtone();
  }, [isIncoming, remotePeers.length, isCallAccepted, callStatus]);

  useEffect(() => {
    if (!isIncoming && !isRejoining && isCallAccepted && remotePeers.length === 0) {
      if (!ringingTimeoutRef.current) {
        ringingTimeoutRef.current = setTimeout(() => {
          setCallStatus("Can't join");
          stopDialtone();
          setTimeout(() => {
            hangUp();
          }, 3000);
        }, 30000);
      }
    } else {
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
    }

    return () => {
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
      }
    };
  }, [isIncoming, isRejoining, isCallAccepted, remotePeers.length]);

  useEffect(() => {
    if (isCallAccepted && typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const vds = devices.filter(d => d.kind === 'videoinput');
          setVideoDevices(vds);
          if (vds.length > 0 && localStream) {
            const activeTrack = localStream.getVideoTracks()[0];
            if (activeTrack) {
              const settings = activeTrack.getSettings();
              if (settings.deviceId) {
                setCurrentVideoDeviceId(settings.deviceId);
              } else {
                setCurrentVideoDeviceId(vds[0].deviceId);
              }
            }
          }
        })
        .catch(err => console.warn('Enumerate devices failed:', err));
    }
  }, [isCallAccepted, localStream]);

  const switchCamera = async () => {
    if (videoDevices.length < 2 || !localStream) return;
    
    const currentIndex = videoDevices.findIndex(d => d.deviceId === currentVideoDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];

    try {
      setCallStatus('Switching camera...');
      const oldVideoTrack = localStream.getVideoTracks()[0];
      
      const newConstraints = {
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: !isMuted
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStream.addTrack(newVideoTrack);

      setLocalStream(new MediaStream(localStream.getTracks()));
      setCurrentVideoDeviceId(nextDevice.deviceId);

      peerConnectionsRef.current.forEach((pc) => {
        const transceivers = pc.getTransceivers();
        const videoTransceiver = transceivers.find((t) => t.sender.track?.kind === 'video');
        if (videoTransceiver && videoTransceiver.sender) {
          videoTransceiver.sender.replaceTrack(newVideoTrack).catch((err) => {
            console.warn('Failed to replace video track on switch:', err);
          });
        }
      });
      setCallStatus('Camera switched.');
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setCallStatus('Camera switch failed.');
    }
  };

  const toggleSpeakerphone = () => {
    const nextState = !useLoudspeaker;
    setUseLoudspeaker(nextState);
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.toggleSpeaker) {
      (window as any).AndroidBridge.toggleSpeaker(nextState);
    }
  };

  const iceServers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  useEffect(() => {
    isCallAcceptedRef.current = isCallAccepted;
  }, [isCallAccepted]);

  // Reactively bind stream to localVideoRef when mounted or state changes
  useEffect(() => {
    if (localVideoRef.current && callType === 'video') {
      if (isScreenSharing && screenStreamRef.current) {
        localVideoRef.current.srcObject = screenStreamRef.current;
      } else {
        localVideoRef.current.srcObject = isVideoOff ? null : localStream;
      }
    }
  }, [localStream, isCallAccepted, isScreenSharing, isVideoOff, callType]);

  // UI colors
  const avatarColors: { [key: string]: string } = {
    RS: 'bg-rose-500 text-white',
    AM: 'bg-amber-500 text-white',
    KS: 'bg-emerald-500 text-white',
    SJ: 'bg-fuchsia-500 text-white',
    PP: 'bg-indigo-500 text-white',
    RK: 'bg-orange-500 text-white',
    AR: 'bg-cyan-500 text-white',
  };

  const getAvatarColor = (initials: string) => {
    return avatarColors[initials] || 'bg-slate-600 text-white';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getUserAvatarUrl = (userId: number) => {
    if (!allUsers) return null;
    const user = allUsers.find((u) => Number(u.id) === Number(userId));
    return user?.avatarUrl || null;
  };

  const renderCallAvatar = (avatarUrl: string | null, name: string, sizeClass: string) => {
    const initials = getInitials(name);
    const isUrl = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/') || avatarUrl.includes('.'));
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nexochat.in';

    if (isUrl) {
      return (
        <img
          src={avatarUrl.startsWith('/') ? `${API_URL}${avatarUrl}` : avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClass.split(' ')[0]} ${sizeClass.split(' ')[1]} rounded-full object-cover shrink-0 shadow-md`}
        />
      );
    }

    const code = avatarUrl || initials;
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 shadow-md ${getAvatarColor(code)}`}>
        {code}
      </div>
    );
  };

  useEffect(() => {
    if (!socket) return;

    const initCall = async () => {
      try {
        setCallStatus('Accessing media devices...');
        let stream: MediaStream = new MediaStream();
        try {
          const constraints = {
            audio: true,
            video: callType === 'video' ? true : false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaError) {
          console.warn('Camera/Mic access failed, trying fallbacks...', mediaError);
          let fallbackSuccess = false;
          try {
            if (callType === 'video') {
              // Try video only
              stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            } else {
              // Try audio only
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            fallbackSuccess = true;
          } catch (fallbackError) {
            console.warn('Single-device fallback failed, trying audio only...', fallbackError);
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              fallbackSuccess = true;
            } catch (audioOnlyError) {
              console.error('All media devices access failed:', audioOnlyError);
            }
          }

          if (!fallbackSuccess) {
            // Fallback: create mock canvas stream
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            let frame = 0;
            const intervalId = setInterval(() => {
              if (!ctx) return;
              ctx.fillStyle = '#0b0f19';
              ctx.fillRect(0, 0, 640, 480);
              
              ctx.fillStyle = callType === 'video' ? '#4f46e5' : '#10b981';
              ctx.beginPath();
              ctx.arc(320 + Math.sin(frame / 20) * 100, 240 + Math.cos(frame / 15) * 50, 40, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.font = '24px sans-serif';
              ctx.fillText(`${currentUser.name} (${callType === 'video' ? 'Camera Live' : 'Voice Only'})`, 40, 60);

              frame++;
            }, 33);

            const canvasStream = (canvas as any).captureStream(30);
            
            let mockAudioTrack: MediaStreamTrack | null = null;
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const dst = audioCtx.createMediaStreamDestination();
              osc.connect(dst);
              osc.start();
              mockAudioTrack = dst.stream.getAudioTracks()[0];
            } catch (e) {
              console.error('Failed to create mock audio track:', e);
            }

            const tracks = callType === 'video' ? [...canvasStream.getVideoTracks()] : [];
            if (mockAudioTrack) {
              tracks.push(mockAudioTrack);
            }
            stream = new MediaStream(tracks);
            (stream as any)._fallbackIntervalId = intervalId;
          }
        }
        // Ensure the stream ALWAYS has a video track so that a video sender is negotiated for screen sharing
        if (stream.getVideoTracks().length === 0) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0b0f19';
            ctx.fillRect(0, 0, 640, 480);
          }
          
          // Draw continuously to keep the canvas stream active in WebRTC
          const intervalId = setInterval(() => {
            if (ctx) {
              ctx.fillStyle = '#0b0f19';
              ctx.fillRect(0, 0, 640, 480);
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(0, 0, 1, 1);
            }
          }, 1000);

          const canvasStream = (canvas as any).captureStream(1);
          const mockVideoTrack = canvasStream.getVideoTracks()[0];
          if (mockVideoTrack) {
            stream.addTrack(mockVideoTrack);
            (stream as any)._voiceMockIntervalId = intervalId;
          }
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        if (isRejoining) {
          setCallStatus('Joining active call...');
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'join-call',
            callType,
          });
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'toggle-video',
            isVideoOff: callType === 'voice' || isVideoOff,
          });
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'toggle-audio',
            isMuted,
          });
          setCallStatus('Connected');
        } else if (isIncoming && incomingOfferSignal) {
          setCallType(incomingOfferSignal.callType || 'video');
          setIsVideoOff(incomingOfferSignal.callType === 'voice');
          
          if (autoAccept) {
            setCallStatus('Connecting call...');
            const { senderId, senderName, signal } = incomingOfferSignal;
            if (signal) {
              const pc = createPeerConnection(senderId, senderName);
              await pc.setRemoteDescription(new RTCSessionDescription(signal));

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('videoCallSignal', {
                roomId,
                senderId: currentUser.id,
                senderName: currentUser.name,
                targetUserId: senderId,
                signal: answer,
                type: 'answer',
              });
              setCallStatus('Connected');
            } else {
              socket.emit('videoCallSignal', {
                roomId,
                senderId: currentUser.id,
                senderName: currentUser.name,
                type: 'join-call',
                callType: incomingOfferSignal.callType || 'video',
              });
              setCallStatus('Connecting to callers...');
            }
          } else {
            setCallStatus('Incoming call. Ready to accept.');
          }
        } else {
          setCallStatus('Calling workspace...');
          // Broadcast offer with null signal to trigger popup on all clients in the room
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'offer',
            callType,
            signal: null,
          });
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'toggle-video',
            isVideoOff: callType === 'voice' || isVideoOff,
          });
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'toggle-audio',
            isMuted,
          });
          setCallStatus('Connected. Waiting for others to join...');
        }
      } catch (err) {
        console.error('Failed to start call:', err);
        setCallStatus('Call initialization failed.');
      }
    };

    initCall();

    // Start DB Call Session Log if Caller
    if (!isIncoming && !isRejoining) {
      socket.emit('startCallSession', {
        roomId,
        callerId: currentUser.id,
        callerName: currentUser.name,
        callType,
      });
    }

    // Bind Socket Relays using a latest ref pattern to avoid stale closures
    const signalListener = (data: any) => {
      if (handleSignalingDataRef.current) {
        handleSignalingDataRef.current(data);
      }
    };

    const sessionEndListener = (session: any) => {
      if (session && session.id === callSessionIdRef.current) {
        setCallStatus('Call ended.');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    };

    socket.on('videoCallSignal', signalListener);
    socket.on('callSessionStarted', (session: any) => {
      callSessionIdRef.current = session.id;
    });
    socket.on('callSessionEnded', sessionEndListener);

    return () => {
      socket.off('videoCallSignal', signalListener);
      socket.off('callSessionStarted');
      socket.off('callSessionEnded', sessionEndListener);
      cleanupCall();
    };
  }, [socket]);

  // Create Peer Connection for a specific user
  function createPeerConnection(targetUserId: number, targetUserName: string): RTCPeerConnection {
    // If connection already exists, return it
    if (peerConnectionsRef.current.has(targetUserId)) {
      return peerConnectionsRef.current.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current.set(targetUserId, pc);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === 'video' && screenStreamRef.current) {
          const screenTrack = screenStreamRef.current.getVideoTracks()[0];
          if (screenTrack) {
            pc.addTrack(screenTrack, screenStreamRef.current!);
            return;
          }
        }
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote track listener
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        setRemotePeers((prev) => {
          if (prev.some((p) => p.userId === targetUserId)) {
            return prev.map((p) => (p.userId === targetUserId ? { ...p, stream } : p));
          }
          return [...prev, { userId: targetUserId, userName: targetUserName, stream }];
        });
      }
    };

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('videoCallSignal', {
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          targetUserId,
          signal: event.candidate,
          type: 'candidate',
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state change with ${targetUserName}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        setCallStatus('Connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(targetUserId);
        if (peerConnectionsRef.current.size === 0) {
          setCallStatus('Call ended.');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    };

    return pc;
  };

  const removePeer = (userId: number) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }
    pendingCandidatesRef.current.delete(userId);
    setRemotePeers((prev) => prev.filter((p) => p.userId !== userId));
  };

  const handleSignalingData = async (data: any) => {
    if (data.senderId === currentUser.id) return;

    // Filter signals targeted specifically at this user (if targetUserId is provided)
    if (data.targetUserId && data.targetUserId !== currentUser.id) return;

    const { senderId, senderName, type, signal } = data;

    switch (type) {
      case 'join-call':
        // Existing participants receive join-call, create offer and connect to new participant
        if (isCallAcceptedRef.current) {
          const pc = createPeerConnection(senderId, senderName);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            targetUserId: senderId,
            signal: offer,
            type: 'offer',
            callType,
          });
        }
        break;

      case 'offer':
        // New participant receives offer, creates answer
        if (isIncoming && !isCallAcceptedRef.current) {
          setIncomingOfferSignal(data);
          setCallType(data.callType || 'video');
          setIsVideoOff(data.callType === 'voice');
          setCallStatus(`Incoming ${data.callType || 'video'} call from ${senderName}`);
        } else {
          if (!signal) {
            console.warn('Received null or undefined signal in offer handling; ignoring.');
            // Skip processing this offer as there's no remote description.
            break;
          }
          try {
            const pc = createPeerConnection(senderId, senderName);
            if (pc.signalingState === 'closed') {
              console.warn(`PeerConnection for ${senderName} (ID: ${senderId}) is closed. Cannot handle offer.`);
              break;
            }
            if (pc.signalingState === 'have-local-offer') {
              console.warn(`Glare detected with ${senderName} (ID: ${senderId}). Rolling back local offer.`);
              await pc.setLocalDescription({ type: 'rollback' }).catch(err => {
                console.error(`Failed to rollback local description for ${senderName}:`, err);
              });
            }
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
              
            // Process queued ICE candidates
            const candidates = pendingCandidatesRef.current.get(senderId) || [];
            for (const cand of candidates) {
              await pc.addIceCandidate(cand).catch(console.error);
            }
            pendingCandidatesRef.current.delete(senderId);
              
            if (pc.signalingState === 'have-remote-offer' || pc.signalingState === 'have-local-pranswer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket?.emit('videoCallSignal', {
                roomId,
                senderId: currentUser.id,
                senderName: currentUser.name,
                targetUserId: senderId,
                signal: answer,
                type: 'answer',
              });
            } else {
              console.warn(`RTCPeerConnection state is ${pc.signalingState} (expected have-remote-offer or have-local-pranswer). Skipping createAnswer.`);
            }
          } catch (err) {
            console.error(`Error handling remote WebRTC offer from ${senderName} (ID: ${senderId}):`, err);
          }
        }
        break;

      case 'answer':
        // Sender receives answer
        const pcAnswer = peerConnectionsRef.current.get(senderId);
        if (pcAnswer) {
          if (signal) {
            try {
              if (pcAnswer.signalingState === 'have-local-offer' || pcAnswer.signalingState === 'have-remote-pranswer') {
                await pcAnswer.setRemoteDescription(new RTCSessionDescription(signal));
              } else {
                console.warn(`RTCPeerConnection signalingState is ${pcAnswer.signalingState} (expected have-local-offer or have-remote-pranswer). Skipping setRemoteDescription for answer.`);
              }
            } catch (err) {
              console.error(`Failed to set remote description for answer from ${senderName} (ID: ${senderId}):`, err);
            }
          } else {
            console.warn('Received null or undefined signal in answer handling; skipping setRemoteDescription.');
          }
          
          // Process queued ICE candidates
          const candidates = pendingCandidatesRef.current.get(senderId) || [];
          for (const cand of candidates) {
            await pcAnswer.addIceCandidate(cand).catch(console.error);
          }
          pendingCandidatesRef.current.delete(senderId);
        }
        break;

      case 'candidate':
        // ICE candidates
        const pcCandidate = peerConnectionsRef.current.get(senderId);
        const iceCandidate = new RTCIceCandidate(signal);
        
        if (pcCandidate && pcCandidate.remoteDescription) {
          await pcCandidate.addIceCandidate(iceCandidate).catch(console.error);
        } else {
          // Queue candidates if description not set yet
          if (!pendingCandidatesRef.current.has(senderId)) {
            pendingCandidatesRef.current.set(senderId, []);
          }
          pendingCandidatesRef.current.get(senderId)!.push(iceCandidate);
        }
        break;

      case 'toggle-video':
        setRemoteVideoMuted((prev) => ({
          ...prev,
          [senderId]: data.isVideoOff,
        }));
        break;

      case 'toggle-audio':
        setRemoteAudioMuted((prev) => ({
          ...prev,
          [senderId]: data.isMuted,
        }));
        break;

      case 'toggle-screen-share':
        setRemoteScreenSharing((prev) => ({
          ...prev,
          [senderId]: data.isScreenSharing,
        }));
        break;

      case 'hangup':
        // Participant left
        removePeer(senderId);
        if (peerConnectionsRef.current.size === 0) {
          setCallStatus('Call ended.');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
        break;
    }
  };

  const acceptCall = async () => {
    setIsCallAccepted(true);
    isCallAcceptedRef.current = true;
    setCallStatus('Connecting call...');

    // Broadcast initial state
    if (socket) {
      socket.emit('videoCallSignal', {
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: 'toggle-video',
        isVideoOff,
      });
      socket.emit('videoCallSignal', {
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: 'toggle-audio',
        isMuted,
      });
    }

    // Now handshake with the caller who sent the offer
    if (incomingOfferSignal) {
      const { senderId, senderName, signal } = incomingOfferSignal;
      if (signal) {
        try {
          const pc = createPeerConnection(senderId, senderName);
          if (pc.signalingState === 'closed') {
            console.warn(`PeerConnection for ${senderName} (ID: ${senderId}) is closed. Cannot accept call.`);
            return;
          }
          if (pc.signalingState === 'have-local-offer') {
            console.warn(`Rolling back local offer during acceptCall for ${senderName}.`);
            await pc.setLocalDescription({ type: 'rollback' }).catch(err => {
              console.error(`Failed to rollback local description for ${senderName}:`, err);
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          if (pc.signalingState === 'have-remote-offer' || pc.signalingState === 'have-local-pranswer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket?.emit('videoCallSignal', {
              roomId,
              senderId: currentUser.id,
              senderName: currentUser.name,
              targetUserId: senderId,
              signal: answer,
              type: 'answer',
            });
            setCallStatus('Connected');
          } else {
            console.warn(`RTCPeerConnection state is ${pc.signalingState} in acceptCall. Skipping createAnswer.`);
          }
        } catch (err) {
          console.error(`Error accepting call from ${senderName} (ID: ${senderId}):`, err);
        }
      } else {
        // Signal is null (initial broadcast invitation), let's emit join-call so the caller initiates PC
        socket?.emit('videoCallSignal', {
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          type: 'join-call',
          callType,
        });
        setCallStatus('Connecting to callers...');
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      if (socket) {
        socket.emit('videoCallSignal', {
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          type: 'toggle-audio',
          isMuted: nextMuted,
        });
      }
    }
  };

  const toggleVideo = () => {
    if (callType === 'voice') return;
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const nextVideoOff = !isVideoOff;
      setIsVideoOff(nextVideoOff);
      if (socket) {
        socket.emit('videoCallSignal', {
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          type: 'toggle-video',
          isVideoOff: nextVideoOff,
        });
      }
    }
  };

  // Screen Sharing Implementation
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen sharing is not supported on this browser or mobile device.");
        return;
      }
      try {
        setCallStatus('Accessing screen share...');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];

        // Listen for screen share cancellation (user clicks "Stop sharing" on browser toolbar)
        screenTrack.onended = () => {
          stopScreenShare();
        };

        // Replace track on all active peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack).catch((err) => {
              console.warn('Failed to replace video track with screen track:', err);
            });
          }
        });

        // Set local preview to screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Emit screen share status to peers
        if (socket) {
          socket.emit('videoCallSignal', {
            roomId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            type: 'toggle-screen-share',
            isScreenSharing: true,
          });
        }
      } catch (err) {
        console.error('Failed to start screen share:', err);
        setCallStatus('Screen share failed.');
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Restore camera video track on all peer connections
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    peerConnectionsRef.current.forEach((pc) => {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack).catch((err) => {
          console.warn('Failed to restore camera track:', err);
        });
      }
    });

    // Revert local preview to camera
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = isVideoOff ? null : localStreamRef.current;
    }

    // Emit screen share status to peers
    if (socket) {
      socket.emit('videoCallSignal', {
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: 'toggle-screen-share',
        isScreenSharing: false,
      });
    }
  };

  const hangUp = () => {
    if (socket) {
      socket.emit('videoCallSignal', {
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: 'hangup',
      });
    }
    onClose();
  };

  const cleanupCall = () => {
    stopDialtone();
    stopScreenShare();

    // Logger writes duration info
    if (!isIncoming && !isRejoining && socket && callSessionIdRef.current) {
      const duration = Math.floor((Date.now() - callStartTimestampRef.current) / 1000);
      const status = isCallAcceptedRef.current ? 'completed' : 'missed';
      socket.emit('endCallSession', {
        roomId,
        sessionId: callSessionIdRef.current,
        duration,
        status,
      });
    }

    // Stop all local media devices
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      if ((localStreamRef.current as any)._fallbackIntervalId) {
        clearInterval((localStreamRef.current as any)._fallbackIntervalId);
      }
      if ((localStreamRef.current as any)._voiceMockIntervalId) {
        clearInterval((localStreamRef.current as any)._voiceMockIntervalId);
      }
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
  };

  // Determine call layout grid CSS
  const getGridClasses = () => {
    const totalPeers = remotePeers.length + 1; // peers + self
    if (totalPeers === 1) return 'grid-cols-1';
    if (totalPeers === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalPeers <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  return isMinimized ? (
    <div className="fixed bottom-4 right-4 z-50 w-80 h-[380px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border-2 border-indigo-500 animate-fade-in transition-all duration-300">
      
      {/* Header toolbar */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center text-white">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-xs truncate max-w-[120px]">
            {callType === 'video' ? 'Video' : 'Voice'} Call
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 bg-black/40 hover:bg-black/60 border border-slate-800 rounded-lg text-white transition cursor-pointer flex items-center justify-center"
            title="Maximize Call"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Video Content Area */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-2 pt-10 pb-14">
        {isIncoming && !isCallAccepted ? (
          <div className="text-center z-10 p-4 w-full bg-slate-900/90 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
            <h3 className="text-[11px] font-bold text-white mb-2.5 truncate">Incoming call...</h3>
            <div className="flex gap-2 justify-center">
              <button
                onClick={acceptCall}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-[9px] transition cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={hangUp}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold text-[9px] transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* Show the primary active/remote user in minimized view, or self if no remote users */}
            {remotePeers.length > 0 ? (
              <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                {(callType === 'voice' && !remoteScreenSharing[remotePeers[0].userId]) || (remoteVideoMuted[remotePeers[0].userId] && !remoteScreenSharing[remotePeers[0].userId]) ? (
                  <div className="flex flex-col items-center gap-2">
                    {renderCallAvatar(getUserAvatarUrl(remotePeers[0].userId), remotePeers[0].userName, 'w-14 h-14 text-lg')}
                    <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{remotePeers[0].userName}</span>
                    {!remoteAudioMuted[remotePeers[0].userId] && <VoiceWaveVisualizer stream={remotePeers[0].stream} />}
                  </div>
                ) : (
                  <RemoteVideo
                    stream={remotePeers[0].stream}
                    className={`w-full h-full ${remoteScreenSharing[remotePeers[0].userId] ? 'object-contain bg-black' : 'object-cover'}`}
                  />
                )}
                {/* Float label */}
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-white text-[9px] font-bold">
                  {remotePeers[0].userName}
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                {(callType === 'voice' && !isScreenSharing) || (isVideoOff && !isScreenSharing) ? (
                  <div className="flex flex-col items-center gap-2">
                    {renderCallAvatar(currentUser.avatarUrl, currentUser.name, 'w-14 h-14 text-lg')}
                    <span className="text-[10px] text-slate-400 font-medium">Ringing...</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover scale-x-[-1]'}`}
                  />
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-white text-[9px] font-bold">
                  You
                </div>
              </div>
            )}
            
            {/* Small picture-in-picture local preview in minimized view if we have remote peers */}
            {remotePeers.length > 0 && !isVideoOff && callType === 'video' && (
              <div className="absolute bottom-2 right-2 w-20 h-15 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simplified Controls bottom toolbar */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-slate-900 border-t border-slate-800 flex justify-center items-center gap-3">
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full transition cursor-pointer ${
            isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition cursor-pointer ${
              isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title={isVideoOff ? "Video On" : "Video Off"}
          >
            {isVideoOff ? <CameraOff size={14} /> : <Camera size={14} />}
          </button>
        )}

        {onInviteUser && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Add Member to Call"
          >
            <UserPlus size={14} />
          </button>
        )}

        <button
          onClick={hangUp}
          className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
          title="Hang Up"
        >
          <PhoneOff size={14} />
        </button>
      </div>

    </div>
  ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl h-[80vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
        
        {/* Header toolbar */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-sm">
              {callType === 'video' ? 'Video Conference' : 'Voice Conference'} • Room #{roomId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-black/40 px-3 py-1 rounded-full text-xs font-mono border border-slate-700">
              {callStatus}
            </div>
            {/* MINIMIZE BUTTON */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 bg-black/40 hover:bg-black/60 border border-slate-700 rounded-lg text-white transition hover:scale-105 cursor-pointer flex items-center justify-center"
              title="Minimize Call Screen"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Video Grid stream container */}
        <div className="flex-1 min-h-0 relative bg-slate-950 flex items-center justify-center p-4 pt-16 pb-20 overflow-hidden">
          {isIncoming && !isCallAccepted ? (
            <div className="text-center z-10 p-8 max-w-sm bg-slate-900/90 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
              <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold animate-bounce shadow-lg shadow-indigo-600/30">
                {incomingOfferSignal?.senderName.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{incomingOfferSignal?.senderName}</h3>
              <p className="text-slate-400 text-sm mb-6">
                Inviting you to a {callType === 'video' ? 'video' : 'voice'} call
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={acceptCall}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/25"
                >
                  <Video size={16} /> Accept Call
                </button>
                <button
                  onClick={hangUp}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-700/25"
                >
                  <PhoneOff size={16} /> Decline
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const activeSharingPeer = remotePeers.find(peer => remoteScreenSharing[peer.userId]);
              const hasScreenShare = isScreenSharing || !!activeSharingPeer;
              const totalPeers = remotePeers.length + 1;

              if (hasScreenShare && isScreenShareMaximized) {
                return (
                  <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
                    {/* Main Screen Share Area */}
                    <div className="flex-1 relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center group/screen">
                      {isScreenSharing ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-contain"
                        />
                      ) : activeSharingPeer ? (
                        <RemoteVideo
                          stream={activeSharingPeer.stream}
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                      {/* Minimize button overlay */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover/screen:opacity-100 transition z-10 flex gap-2">
                        <button
                          onClick={() => setIsScreenShareMaximized(false)}
                          className="p-2 bg-black/60 hover:bg-black/80 border border-slate-700/50 rounded-xl text-white transition hover:scale-105 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                          title="Minimize Screen Share"
                        >
                          <Minimize2 size={14} /> Minimize Screen Share
                        </button>
                      </div>
                      {/* Details label */}
                      <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg text-white text-xs font-bold border border-slate-800 z-10 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        {isScreenSharing ? 'Your Shared Screen' : `${activeSharingPeer?.userName}'s Shared Screen`}
                      </div>
                    </div>

                    {/* Smaller scrollable camera row at the bottom */}
                    <div className="h-28 flex gap-3 overflow-x-auto overflow-y-hidden max-w-full pb-2 p-1 scrollbar-thin scrollbar-thumb-slate-700 shrink-0">
                      {/* Local Camera */}
                      <div className="w-36 h-24 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-md shrink-0">
                        {(isVideoOff && !isScreenSharing) || (callType === 'voice' && !isScreenSharing) ? (
                          <div className="flex flex-col items-center gap-1">
                            {renderCallAvatar(currentUser.avatarUrl, currentUser.name, 'w-8 h-8 text-xs')}
                            <span className="text-[9px] text-slate-400 font-bold truncate max-w-[80px]">You</span>
                          </div>
                        ) : (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                        )}
                        <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-white text-[8px] font-bold">
                          You
                        </div>
                      </div>

                      {/* Remote Cameras */}
                      {remotePeers.map((peer) => {
                        const initials = getInitials(peer.userName);
                        const isVoiceMode = callType === 'voice';
                        const isVideoMuted = remoteVideoMuted[peer.userId];
                        const isAudioMuted = remoteAudioMuted[peer.userId];
                        const isPeerScreenSharing = remoteScreenSharing[peer.userId];

                        return (
                          <div key={peer.userId} className="w-36 h-24 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-md shrink-0">
                            {/* Audio track */}
                            <RemoteAudio stream={peer.stream} />

                            {(isVoiceMode && !isPeerScreenSharing) || (isVideoMuted && !isPeerScreenSharing) ? (
                              <div className="flex flex-col items-center gap-1">
                                {renderCallAvatar(getUserAvatarUrl(peer.userId), peer.userName, 'w-8 h-8 text-xs')}
                                <span className="text-[9px] text-slate-400 font-bold truncate max-w-[80px]">{peer.userName}</span>
                              </div>
                            ) : (
                              <RemoteVideo
                                stream={peer.stream}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-white text-[8px] font-bold">
                              {peer.userName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Normal Grid Layout
              return (
                <div className={`grid w-full gap-4 ${getGridClasses()} ${totalPeers > 2 ? 'auto-rows-[220px] overflow-y-auto max-h-full scrollbar-thin pr-1 p-1' : 'h-full'}`}>
                  
                  {/* Local Participant Frame */}
                  <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg group">
                    {(isVideoOff && !isScreenSharing) || (callType === 'voice' && !isScreenSharing) ? (
                      <div className="flex flex-col items-center gap-3">
                        {renderCallAvatar(currentUser.avatarUrl, currentUser.name, 'w-20 h-20 text-2xl')}
                        <span className="text-xs text-slate-400 font-bold">{currentUser.name} (You)</span>
                        {localStream && !isMuted ? (
                          <VoiceWaveVisualizer stream={localStream} />
                        ) : (
                          <span className="text-xs text-rose-500 font-bold flex items-center gap-1 mt-2 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                            <MicOff size={10} /> Muted
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full relative">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full bg-black ${isScreenSharing ? 'object-contain' : 'object-cover scale-x-[-1]'}`}
                        />
                        {isScreenSharing && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition z-10 flex gap-2">
                            <button
                              onClick={() => setIsScreenShareMaximized(true)}
                              className="p-1.5 bg-black/60 hover:bg-black/80 border border-slate-700/50 rounded-lg text-white transition hover:scale-105 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                              title="Maximize Screen Share"
                            >
                              <Maximize2 size={10} /> Maximize Screen
                            </button>
                          </div>
                        )}
                        {/* Small overlay visualizer if talking */}
                        {localStream && !isMuted && (
                          <div className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded-full border border-slate-800 z-10 flex items-center justify-center scale-75 origin-top-right">
                            <VoiceWaveVisualizer stream={localStream} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Overlay details */}
                    <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold border border-slate-800 z-10">
                      {currentUser.name} (You) {isScreenSharing && '• Screen Sharing'}
                    </div>
                  </div>

                  {/* Remote Participants Frames */}
                  {remotePeers.map((peer) => {
                    const initials = getInitials(peer.userName);
                    const isVoiceMode = callType === 'voice';
                    const isVideoMuted = remoteVideoMuted[peer.userId];
                    const isAudioMuted = remoteAudioMuted[peer.userId];
                    const isPeerScreenSharing = remoteScreenSharing[peer.userId];

                    return (
                      <div key={peer.userId} className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg group">
                        {/* Always render audio so we hear them */}
                        <RemoteAudio stream={peer.stream} />

                        {(isVoiceMode && !isPeerScreenSharing) || (isVideoMuted && !isPeerScreenSharing) ? (
                          <div className="flex flex-col items-center gap-3">
                            {/* Pulsing ring around talking user */}
                            <div className="relative">
                              {!isAudioMuted && (
                                <span className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-ping"></span>
                              )}
                              {renderCallAvatar(getUserAvatarUrl(peer.userId), peer.userName, 'w-20 h-20 text-2xl relative z-10')}
                            </div>
                            <span className="text-xs text-slate-400 font-bold">{peer.userName}</span>
                            {!isAudioMuted ? (
                              <VoiceWaveVisualizer stream={peer.stream} />
                            ) : (
                              <span className="text-xs text-rose-500 font-bold flex items-center gap-1 mt-2 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                                <MicOff size={10} /> Muted
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full relative">
                            <RemoteVideo
                              stream={peer.stream}
                              className={`w-full h-full ${isPeerScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
                            />
                            {isPeerScreenSharing && (
                              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition z-10 flex gap-2">
                                <button
                                  onClick={() => setIsScreenShareMaximized(true)}
                                  className="p-1.5 bg-black/60 hover:bg-black/80 border border-slate-700/50 rounded-lg text-white transition hover:scale-105 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                  title="Maximize Screen Share"
                                >
                                  <Maximize2 size={10} /> Maximize Screen
                                </button>
                              </div>
                            )}
                            {/* Mini visualizer overlay on remote video frame when talking */}
                            {!isAudioMuted && (
                              <div className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded-full border border-slate-800 z-10 flex items-center justify-center scale-75 origin-top-right">
                                <VoiceWaveVisualizer stream={peer.stream} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Overlay details */}
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold border border-slate-800 z-10">
                          {peer.userName} {isVideoMuted && '• Video Off'}
                        </div>
                      </div>
                    );
                  })}

                </div>
              );
            })()
          )}
        </div>

        {/* Control toolbar */}
        {(!isIncoming || isCallAccepted) && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-slate-900 border-t border-slate-800 flex justify-center items-center gap-4 z-30">
            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full transition cursor-pointer shadow-md ${
                isMuted
                  ? 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            
            {/* Video Toggle (Only for Video Calls) */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-full transition cursor-pointer shadow-md ${
                  isVideoOff
                    ? 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <CameraOff size={18} /> : <Camera size={18} />}
              </button>
            )}

            {/* Camera Switch (Only if multiple cameras are available and video is on) */}
            {callType === 'video' && !isVideoOff && videoDevices.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-3.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer shadow-md"
                title="Switch Camera"
              >
                <RefreshCw size={18} />
              </button>
            )}

            {/* Loudspeaker Toggle (Only if running in Android app WebView) */}
            {typeof window !== 'undefined' && (window as any).AndroidBridge?.toggleSpeaker && (
              <button
                onClick={toggleSpeakerphone}
                className={`p-3.5 rounded-full transition cursor-pointer shadow-md ${
                  useLoudspeaker
                    ? 'bg-indigo-650 text-white hover:bg-[#4f46e5]'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={useLoudspeaker ? 'Switch to Normal Speaker' : 'Switch to Loudspeaker'}
              >
                <Volume2 size={18} />
              </button>
            )}

            {/* Screen Share Toggle (Only for Video Calls) */}
            {callType === 'video' && (
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full transition cursor-pointer shadow-md ${
                  isScreenSharing
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              </button>
            )}

            {/* Add Member Button */}
            {onInviteUser && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-3.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer shadow-md"
                title="Add Member to Call"
              >
                <UserPlus size={18} />
              </button>
            )}

            {/* Space splitter */}
            <div className="w-[1px] bg-slate-800 h-6 mx-1"></div>

            {/* Hangup */}
            <button
              onClick={hangUp}
              className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-rose-700/20"
              title="Hang Up Call"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        )}

      </div>

      {/* Invite Member Modal */}
      {showInviteModal && allUsers && onInviteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up text-left">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <UserPlus size={18} className="text-indigo-400" /> Invite Member to Call
            </h3>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {allUsers
                .filter(u => u.id !== currentUser.id && !remotePeers.some(p => p.userId === u.id))
                .map(user => {
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {renderCallAvatar(user.avatarUrl, user.name, 'w-8 h-8 text-[10px]')}
                        <div className="overflow-hidden">
                          <span className="text-white block font-bold truncate">{user.name}</span>
                          <span className="text-slate-400 block truncate">{user.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onInviteUser(user.id);
                          setShowInviteModal(false);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[10px] transition cursor-pointer"
                      >
                        Invite
                      </button>
                    </div>
                  );
                })}
              {allUsers.filter(u => u.id !== currentUser.id && !remotePeers.some(p => p.userId === u.id)).length === 0 && (
                <p className="text-slate-400 text-xs text-center py-4">No other members available to invite.</p>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
