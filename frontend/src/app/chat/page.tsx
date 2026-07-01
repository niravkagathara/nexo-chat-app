'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../hooks/useSocket';
import { VideoCall } from '../../components/VideoCall';
import {
  Sparkles,
  Plus,
  LogOut,
  Send,
  Paperclip,
  Smile,
  Users,
  Pin,
  Image as ImageIcon,
  FileText,
  Video,
  Hash,
  MessageSquare,
  Info,
  CheckCheck,
  Edit,
  User,
  Settings,
  Circle,
  HelpCircle,
  Eye,
  EyeOff,
  Search,
  Copy,
  Bell,
  BellOff,
  Trash2,
  CornerUpLeft,
  Phone,
  Menu,
  Moon,
  Sun,
  X,
  MoreVertical,
  Download,
  Upload,
  Shield,
  ArrowLeft,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nexochat.in';

export default function ChatPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('nexo_token');
    localStorage.removeItem('nexo_user');
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.clearAuthData) {
      (window as any).AndroidBridge.clearAuthData();
    }
    router.push('/');
  };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<any>({});

  // Right sidebar details state
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showAllCallHistory, setShowAllCallHistory] = useState(false);
  const [showAllSharedFiles, setShowAllSharedFiles] = useState(false);
  const [showAllPinnedMessages, setShowAllPinnedMessages] = useState(false);

  // Modals & Panels state
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIsGroup, setNewRoomIsGroup] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mention Autocomplete States
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Profile Edit Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editStatus, setEditStatus] = useState('online');
  const [editStatusMsg, setEditStatusMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Extended Feature States
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');

  // Member Management Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedAddMemberId, setSelectedAddMemberId] = useState<number | null>(null);

  // Group editing state
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  // Sidebar search state
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  // WebRTC Calling state
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callType, setCallType] = useState<'video' | 'voice'>('video');
  const [callRoomId, setCallRoomId] = useState<number | null>(null);
  const [activeCalls, setActiveCalls] = useState<{ [roomId: number]: any }>({});
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [newRoomAvatarUrl, setNewRoomAvatarUrl] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('');

  // Theme states
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('nexo_theme') as 'light' | 'dark' | null;
    let activeTheme: 'light' | 'dark' = 'light';
    if (savedTheme) {
      activeTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      activeTheme = 'dark';
    }
    setTheme(activeTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0b0f19';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f1f5f9';
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('nexo_theme', nextTheme);
  };

  // Emoji Picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<any>(null);
  const ringtoneAudioRef = useRef<any>(null);
  const ringtoneTimeoutRef = useRef<any>(null);

  // Socket setup
  const { socket, isConnected } = useSocket(API_URL);

  // Synthetic loop ringtone
  const playRingtone = () => {
    try {
      stopRingtone();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      ringtoneAudioRef.current = audioCtx;

      const playTonePattern = () => {
        if (audioCtx.state === 'closed') return;

        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(480, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(440, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.4);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 1.5);
        osc2.stop(audioCtx.currentTime + 1.5);

        ringtoneTimeoutRef.current = setTimeout(() => {
          playTonePattern();
        }, 3000);
      };

      playTonePattern();
    } catch (e) {
      console.warn('Synthetic Audio Ringtone initialization failed:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
    if (ringtoneAudioRef.current) {
      try {
        ringtoneAudioRef.current.close();
      } catch (e) { }
      ringtoneAudioRef.current = null;
    }
  };

  const playMessageSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(587.33, 0, 0.12); // D5
      playTone(880, 0.08, 0.2);   // A5
    } catch (e) {
      console.warn('Failed to play message sound:', e);
    }
  };

  // Ringtone & Ringing Timeout Side Effect
  useEffect(() => {
    let timeoutId: any = null;
    if (incomingCall && !inCall) {
      playRingtone();
      // Set a 30 second timeout to auto-hangup if there is no answer
      timeoutId = setTimeout(() => {
        if (socket) {
          socket.emit('videoCallSignal', {
            roomId: incomingCall.roomId || (activeRoom ? activeRoom.id : 0),
            senderId: currentUser?.id,
            senderName: currentUser?.name || 'User',
            signal: null,
            type: 'hangup',
          });
        }
        setIncomingCall(null);
        alert('Call missed (no answer).');
      }, 30000); // 30 seconds ringing timeout
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [incomingCall, inCall, socket, currentUser, activeRoom]);

  // 1. Auth check and initial loads
  useEffect(() => {
    const token = localStorage.getItem('nexo_token');
    const userStr = localStorage.getItem('nexo_user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userStr);
    setCurrentUser(parsedUser);

    // Initialize edit fields
    setEditName(parsedUser.name);
    setEditAvatarUrl(parsedUser.avatarUrl || 'US');
    setEditStatus(parsedUser.status || 'online');
    setEditStatusMsg(parsedUser.statusMessage || '');

    // Verify session and update profile data
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const freshUser = await res.json();
          setCurrentUser(freshUser);
          localStorage.setItem('nexo_user', JSON.stringify(freshUser));
          // Update edit profile modal inputs to match fresh database values
          setEditName(freshUser.name);
          setEditAvatarUrl(freshUser.avatarUrl || 'US');
          setEditStatus(freshUser.status || 'online');
          setEditStatusMsg(freshUser.statusMessage || '');
        }
      })
      .catch(() => { });

    loadRooms(token, parsedUser.id);
    loadUsers(token);

    // Request Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [router]);

  // Synchronize login credentials with Android WebView native storage for closed-app background notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.saveAuthData) {
      const token = localStorage.getItem('nexo_token');
      if (token && currentUser) {
        (window as any).AndroidBridge.saveAuthData(token, currentUser.id, currentUser.name);
      }
    }
  }, [currentUser]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Register user with socket server immediately on connect
  useEffect(() => {
    if (socket && isConnected && currentUser) {
      socket.emit('registerUser', {
        userId: currentUser.id,
        userName: currentUser.name,
      });
    }
  }, [socket, isConnected, currentUser?.id]);

  // Join all rooms when socket and rooms are ready to ensure real-time updates and calls from other channels
  useEffect(() => {
    if (socket && isConnected && rooms.length > 0 && currentUser) {
      rooms.forEach((room) => {
        socket.emit('joinRoom', {
          roomId: room.id,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      });
    }
  }, [socket, isConnected, rooms.length, currentUser]);

  // 2. Load Rooms, Messages & Extras
  const loadRooms = async (token: string, userId: number, selectRoomId?: number) => {
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setRooms(data);
        if (data.length > 0) {
          const target = selectRoomId
            ? (data.find((r: any) => r.id === selectRoomId) || data.find((r: any) => r.isGroup && r.name === 'general') || data[0])
            : data.find((r: any) => r.isGroup && r.name === 'general') || data[0];

          if (target) {
            handleSelectRoom(target);
          }
        } else {
          setActiveRoom(null);
        }
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    }
  };

  const loadUsers = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setAllUsers(data);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const loadRoomExtras = async (roomId: number, token: string) => {
    try {
      // 1. Pinned messages
      const pinRes = await fetch(`${API_URL}/rooms/${roomId}/pinned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pinRes.status === 401) {
        handleLogout();
        return;
      }
      if (pinRes.ok) {
        const pinData = await pinRes.json();
        setPinnedMessages(pinData);
      }

      // 2. Shared files
      const fileRes = await fetch(`${API_URL}/rooms/${roomId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fileRes.status === 401) {
        handleLogout();
        return;
      }
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        setSharedFiles(fileData);
      }

      // 3. Call history logs
      const callRes = await fetch(`${API_URL}/rooms/${roomId}/calls`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (callRes.status === 401) {
        handleLogout();
        return;
      }
      if (callRes.ok) {
        const callData = await callRes.json();
        setCallHistory(callData);
      }
    } catch (e) {
      console.error('Failed to load room details:', e);
    }
  };

  const handleSelectRoom = async (room: any) => {
    setActiveRoom(room);
    setMessages([]);
    setTypingUsers({});
    setSearchQuery('');
    setReplyToMessage(null);
    setEditingMessageId(null);
    setShowMobileSidebar(false);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowRightPanel(false);
    }

    // Clear unreads count locally
    setRooms((prevRooms) =>
      prevRooms.map((r) => r.id === room.id ? { ...r, unreadCount: 0 } : r)
    );

    // Trigger incoming call popup if selecting a DM room with an active call that we are not in
    const currentRoomCall = activeCalls[room.id];
    if (currentRoomCall && !room.isGroup) {
      if (currentUser && !currentRoomCall.participants.includes(currentUser.id)) {
        setIncomingCall({
          roomId: room.id,
          senderId: currentRoomCall.callerId,
          senderName: currentRoomCall.callerName,
          callType: currentRoomCall.callType,
          signal: null,
        });
        setCallRoomId(room.id);
        setCallType(currentRoomCall.callType);
      }
    }

    if (socket && currentUser) {
      socket.emit('joinRoom', { roomId: room.id, userId: currentUser.id, userName: currentUser.name });
      socket.emit('markRead', { roomId: room.id, userId: currentUser.id });
    }

    const token = localStorage.getItem('nexo_token');
    if (token) {
      try {
        const res = await fetch(`${API_URL}/rooms/${room.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        const data = await res.json();
        if (res.ok) {
          setMessages(data);
        }

        // Mark as read in DB
        const readRes = await fetch(`${API_URL}/rooms/${room.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (readRes.status === 401) {
          handleLogout();
          return;
        }
      } catch (e) {
        console.error('Failed to load room messages:', e);
      }

      // Load side panels details
      loadRoomExtras(room.id, token);
    }
  };

  const activeRoomRef = useRef(activeRoom);
  const roomsRef = useRef(rooms);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const updateLocalUserPresence = (
    userId: number,
    status: string,
    statusMessage?: string | null,
    name?: string,
    avatarUrl?: string | null
  ) => {
    // 1. Update currentUser if it matches the changed user
    if (currentUserRef.current && Number(currentUserRef.current.id) === Number(userId)) {
      setCurrentUser((prev: any) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          status,
          statusMessage: statusMessage !== undefined ? statusMessage : prev.statusMessage,
          name: name || prev.name,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : prev.avatarUrl,
        };
        localStorage.setItem('nexo_user', JSON.stringify(updated));
        return updated;
      });
    }

    // 2. Update allUsers list
    setAllUsers((prev) =>
      prev.map((u) =>
        Number(u.id) === Number(userId)
          ? {
              ...u,
              status,
              statusMessage: statusMessage !== undefined ? statusMessage : u.statusMessage,
              name: name || u.name,
              avatarUrl: avatarUrl !== undefined ? avatarUrl : u.avatarUrl,
            }
          : u
      )
    );

    // 3. Update rooms participants presence
    setRooms((prevRooms) =>
      prevRooms.map((room) => {
        const updatedParts = room.participants?.map((p: any) => {
          if (p.user && Number(p.user.id) === Number(userId)) {
            return {
              ...p,
              user: {
                ...p.user,
                status,
                statusMessage: statusMessage !== undefined ? statusMessage : p.user.statusMessage,
                name: name || p.user.name,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : p.user.avatarUrl,
              },
            };
          }
          return p;
        });

        let updatedRoomName = room.name;
        let updatedRoomAvatar = room.avatarUrl;
        if (!room.isGroup) {
          const otherPart = updatedParts?.find(
            (p: any) => p.user && Number(p.user.id) !== Number(currentUserRef.current?.id)
          );
          if (otherPart && otherPart.user && Number(otherPart.user.id) === Number(userId)) {
            updatedRoomName = otherPart.user.name;
            updatedRoomAvatar = otherPart.user.avatarUrl;
          }
        }

        return {
          ...room,
          participants: updatedParts,
          name: updatedRoomName,
          avatarUrl: updatedRoomAvatar,
        };
      })
    );

    // 4. Update activeRoom participants
    setActiveRoom((prevActive: any) => {
      if (!prevActive) return null;
      const updatedParts = prevActive.participants?.map((p: any) => {
        if (p.user && Number(p.user.id) === Number(userId)) {
          return {
            ...p,
            user: {
              ...p.user,
              status,
              statusMessage: statusMessage !== undefined ? statusMessage : p.user.statusMessage,
              name: name || p.user.name,
              avatarUrl: avatarUrl !== undefined ? avatarUrl : p.user.avatarUrl,
            },
          };
        }
        return p;
      });

      let updatedRoomName = prevActive.name;
      let updatedRoomAvatar = prevActive.avatarUrl;
      if (!prevActive.isGroup) {
        const otherPart = updatedParts?.find(
          (p: any) => p.user && Number(p.user.id) !== Number(currentUserRef.current?.id)
        );
        if (otherPart && otherPart.user && Number(otherPart.user.id) === Number(userId)) {
          updatedRoomName = otherPart.user.name;
          updatedRoomAvatar = otherPart.user.avatarUrl;
        }
      }

      return {
        ...prevActive,
        participants: updatedParts,
        name: updatedRoomName,
        avatarUrl: updatedRoomAvatar,
      };
    });
  };

  // 3. Socket Listeners Setup
  useEffect(() => {
    if (!socket || !currentUser) return;

    if (activeRoomRef.current) {
      socket.emit('joinRoom', { roomId: activeRoomRef.current.id, userId: currentUser.id, userName: currentUser.name });
    }

    // Message listener
    socket.on('roomMessage', (msg: any) => {
      // Play message chime if not muted
      if (msg.userId !== currentUser.id) {
        const targetRoom = roomsRef.current.find((r) => r.id === msg.roomId);
        const isMuted = targetRoom?.isMuted || false;
        if (!isMuted) {
          playMessageSound();
        }
      }

      if (activeRoomRef.current && msg.roomId === activeRoomRef.current.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If message has attachments, reload shared files
        if (msg.attachments && msg.attachments.length > 0) {
          const token = localStorage.getItem('nexo_token');
          if (token) loadRoomExtras(activeRoomRef.current.id, token);
        }

        // Mark read immediately
        socket.emit('markRead', { roomId: activeRoomRef.current.id, userId: currentUser.id });
        const token = localStorage.getItem('nexo_token');
        if (token) {
          fetch(`${API_URL}/rooms/${activeRoomRef.current.id}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => { });
        }
      } else {
        // Increment unread count for inactive rooms
        setRooms((prevRooms) =>
          prevRooms.map((r) => r.id === msg.roomId ? { ...r, unreadCount: (r.unreadCount || 0) + 1 } : r)
        );
      }

      // Push notification if window is not focused or not in active room
      const hasAndroidBridge = typeof window !== 'undefined' && (window as any).AndroidBridge?.showNotification;
      const hasWebNotification = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      if (msg.userId !== currentUser.id && (hasWebNotification || hasAndroidBridge)) {
        const targetRoom = roomsRef.current.find((r) => r.id === msg.roomId);
        const isMuted = targetRoom?.isMuted || false;

        if (!isMuted && (document.hidden || activeRoomRef.current?.id !== msg.roomId)) {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge?.showNotification) {
            (window as any).AndroidBridge.showNotification(`Nexo Chat - ${msg.user.name}`, msg.content);
          } else {
            new Notification(`Nexo Chat - ${msg.user.name}`, {
              body: msg.content,
            });
          }
        }
      }
    });

    // Read Receipt listener
    socket.on('roomReadReceipt', (data: any) => {
      // Update read receipt state on messages
      if (activeRoomRef.current && activeRoomRef.current.id === data.roomId) {
        setActiveRoom((prevActive: any) => {
          if (!prevActive) return null;
          const updatedParts = prevActive.participants?.map((p: any) => {
            if (p.userId === data.userId) {
              return { ...p, lastReadAt: data.lastReadAt };
            }
            return p;
          });
          return { ...prevActive, participants: updatedParts };
        });
      }
    });

    // Reactions listener
    socket.on('reactionsUpdated', (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        )
      );
    });

    // Message edited listener
    socket.on('messageEdited', (updatedMsg: any) => {
      if (activeRoomRef.current && updatedMsg.roomId === activeRoomRef.current.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
        );
      }
    });

    // Message deleted listener
    socket.on('messageDeleted', (deletedMsg: any) => {
      if (activeRoomRef.current && deletedMsg.roomId === activeRoomRef.current.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === deletedMsg.id ? deletedMsg : msg))
        );
        const token = localStorage.getItem('nexo_token');
        if (token) loadRoomExtras(activeRoomRef.current.id, token);
      }
    });

    // Typing listener
    socket.on('userTyping', (data: any) => {
      if (activeRoomRef.current && data.roomId === activeRoomRef.current.id && data.userId !== currentUser.id) {
        setTypingUsers((prev: any) => {
          const next = { ...prev };
          if (data.isTyping) {
            next[data.userId] = data.userName;
          } else {
            delete next[data.userId];
          }
          return next;
        });
      }
    });

    // Status change listener
    socket.on('userStatusChanged', (data: any) => {
      updateLocalUserPresence(data.userId, data.status, data.statusMessage, data.name, data.avatarUrl);
    });

    // Message pin status change listener
    socket.on('messagePinned', (data: any) => {
      if (activeRoomRef.current && data.roomId === activeRoomRef.current.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.messageId ? { ...msg, isPinned: data.isPinned } : msg))
        );
        const token = localStorage.getItem('nexo_token');
        if (token) loadRoomExtras(activeRoomRef.current.id, token);
      }
    });

    // DM request acceptance listeners
    socket.on('dmStatusUpdated', (data: any) => {
      if (activeRoomRef.current && activeRoomRef.current.id === data.roomId) {
        setActiveRoom((prevActive: any) => prevActive ? { ...prevActive, dmStatus: data.dmStatus } : null);
      }
      const token = localStorage.getItem('nexo_token');
      if (token && currentUser) {
        loadRooms(token, currentUser.id, activeRoomRef.current?.id);
      }
    });

    // WebRTC calling signal listener
    socket.on('videoCallSignal', (data: any) => {
      if (data.senderId !== currentUser.id) {
        if (data.type === 'offer') {
          if (!inCall) {
            setIncomingCall(data);
            setCallRoomId(data.roomId);
            if (data.callType) {
              setCallType(data.callType);
            }
            // Show browser notification for incoming call
            const hasAndroidBridge = typeof window !== 'undefined' && (window as any).AndroidBridge?.showNotification;
            const hasWebNotification = typeof Notification !== 'undefined' && Notification.permission === 'granted';
            if ((hasWebNotification || hasAndroidBridge) && document.hidden) {
              if (typeof window !== 'undefined' && (window as any).AndroidBridge?.showNotification) {
                (window as any).AndroidBridge.showNotification(
                  `Nexo Chat - Incoming ${data.callType || 'video'} call`,
                  `${data.senderName} is calling you...`
                );
              } else {
                new Notification(`Nexo Chat - Incoming ${data.callType || 'video'} call`, {
                  body: `${data.senderName} is calling you...`,
                  tag: `call_${data.roomId}`,
                  requireInteraction: true,
                });
              }
            }
          }
        } else if (data.type === 'hangup') {
          setIncomingCall((prev: any) => {
            if (prev && prev.senderId === data.senderId) {
              setCallRoomId(null);
              return null;
            }
            return prev;
          });
        }
      }
    });

    // Active Call Status updates
    socket.on('activeCallStatus', (data: { roomId: number; hasActiveCall: boolean; call?: any }) => {
      setActiveCalls((prev) => {
        const next = { ...prev };
        if (data.hasActiveCall && data.call) {
          next[data.roomId] = data.call;

          // If the status is for the currently active room, and we are not in the call, and it is a DM
          if (activeRoomRef.current && activeRoomRef.current.id === data.roomId && !activeRoomRef.current.isGroup) {
            if (currentUser && !data.call.participants.includes(currentUser.id)) {
              setIncomingCall({
                roomId: data.roomId,
                senderId: data.call.callerId,
                senderName: data.call.callerName,
                callType: data.call.callType,
                signal: null,
              });
              setCallRoomId(data.roomId);
              setCallType(data.call.callType);
            }
          }
        } else {
          delete next[data.roomId];
          // If the active call for current room ended, clear incoming call
          if (activeRoomRef.current && activeRoomRef.current.id === data.roomId) {
            setIncomingCall((prevIncoming: any) => {
              if (prevIncoming && (prevIncoming.roomId === data.roomId || !prevIncoming.roomId)) {
                return null;
              }
              return prevIncoming;
            });
          }
        }
        return next;
      });
    });

    // Call history sessions logs listeners
    socket.on('callSessionStarted', (session: any) => {
      if (activeRoomRef.current && session.roomId === activeRoomRef.current.id) {
        const token = localStorage.getItem('nexo_token');
        if (token) loadRoomExtras(activeRoomRef.current.id, token);
      }
    });

    socket.on('callSessionEnded', (session: any) => {
      if (activeRoomRef.current && session.roomId === activeRoomRef.current.id) {
        const token = localStorage.getItem('nexo_token');
        if (token) loadRoomExtras(activeRoomRef.current.id, token);
      }
    });

    // Member changes update listener
    socket.on('roomMembersUpdated', (data: any) => {
      if (activeRoomRef.current && activeRoomRef.current.id === data.roomId) {
        const token = localStorage.getItem('nexo_token');
        if (token) {
          const currentRoomId = activeRoomRef.current.id;
          fetch(`${API_URL}/rooms`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data) && activeRoomRef.current && activeRoomRef.current.id === currentRoomId) {
                const match = data.find((r: any) => r && r.id === currentRoomId);
                if (match) {
                  setActiveRoom(match);
                }
              }
            })
            .catch(() => {});
          loadRoomExtras(currentRoomId, token);
        }
      }
    });

    // Global room updates
    socket.on('globalRoomUpdate', (data: any) => {
      const token = localStorage.getItem('nexo_token');
      if (token && currentUser) {
        loadRooms(token, currentUser.id, activeRoomRef.current?.id);
      }
    });

    socket.on('clearChatHistory', (data: { roomId: number }) => {
      if (activeRoomRef.current && activeRoomRef.current.id === data.roomId) {
        setMessages([]);
        setPinnedMessages([]);
        setSharedFiles([]);
      }
    });

    return () => {
      socket.off('roomMessage');
      socket.off('roomReadReceipt');
      socket.off('reactionsUpdated');
      socket.off('userTyping');
      socket.off('userStatusChanged');
      socket.off('messagePinned');
      socket.off('videoCallSignal');
      socket.off('activeCallStatus');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('dmStatusUpdated');
      socket.off('callSessionStarted');
      socket.off('callSessionEnded');
      socket.off('roomMembersUpdated');
      socket.off('globalRoomUpdate');
      socket.off('clearChatHistory');
    };
  }, [socket, currentUser]);

  // 4. Input events & typing status
  const handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    sendTypingStatus(true);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9_]*)$/);

    if (mentionMatch && activeRoom?.isGroup) {
      const query = mentionMatch[1].toLowerCase();
      setMentionSearch(query);
      setMentionTriggerIndex(selectionStart - mentionMatch[0].length);

      const filtered = (activeRoom.participants || [])
        .map((p: any) => p.user)
        .filter((u: any) => u && u.id !== currentUser?.id && u.name.toLowerCase().includes(query));

      setMentionSuggestions(filtered);
      setShowMentionsDropdown(filtered.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionsDropdown(false);
      setMentionSuggestions([]);
    }
  };

  const insertMention = (user: any) => {
    if (mentionTriggerIndex === -1) return;
    const value = newMessage;
    const before = value.slice(0, mentionTriggerIndex);
    const after = value.slice(mentionTriggerIndex + mentionSearch.length + 1); // +1 for @
    const completedText = `${before}@${user.name} ${after}`;
    setNewMessage(completedText);
    setShowMentionsDropdown(false);
    setMentionSuggestions([]);

    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea && textarea.tagName === 'TEXTAREA') {
      textarea.focus();
      const newCursorPos = mentionTriggerIndex + user.name.length + 2;
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!socket || !activeRoom || !currentUser) return;

    if (isTyping) {
      isTypingRef.current = true;
      socket.emit('typing', {
        roomId: activeRoom.id,
        userId: currentUser.id,
        userName: currentUser.name,
        isTyping: true,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 3000);
    } else {
      isTypingRef.current = false;
      socket.emit('typing', {
        roomId: activeRoom.id,
        userId: currentUser.id,
        userName: currentUser.name,
        isTyping: false,
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // 5. Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !socket || !activeRoom || !currentUser) return;

    socket.emit('sendMessage', {
      content: newMessage.trim(),
      roomId: activeRoom.id,
      userId: currentUser.id,
      parentId: replyToMessage ? replyToMessage.id : undefined,
    });

    setNewMessage('');
    setReplyToMessage(null);
    sendTypingStatus(false);
    setShowMentionsDropdown(false);
    setMentionSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionsDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const user = mentionSuggestions[selectedMentionIndex];
        if (user) {
          insertMention(user);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionsDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  // 6. Attachment Upload
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom || !currentUser || !socket) return;

    // Enforce 100MB size limit
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File exceeds the 100MB limit. Please upload a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload`);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const uploadData = JSON.parse(xhr.responseText);
          socket.emit('sendMessage', {
            content: `Shared a file: ${file.name}`,
            roomId: activeRoom.id,
            userId: currentUser.id,
            attachments: [
              {
                fileName: uploadData.fileName,
                fileType: uploadData.fileType,
                fileUrl: uploadData.fileUrl,
                fileSize: uploadData.fileSize,
              },
            ],
          });
        } catch (err) {
          console.error('Failed to parse upload response:', err);
          alert('Upload failed parsing response');
        }
      } else {
        alert('File upload failed');
      }
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.onerror = () => {
      console.error('XHR Upload network error');
      alert('Upload network error');
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.send(formData);
  };

  // 7. Toggle Reaction
  const handleAddReaction = (messageId: number, emoji: string) => {
    if (!socket || !activeRoom || !currentUser) return;
    socket.emit('addReaction', {
      userId: currentUser.id,
      messageId,
      emoji,
      roomId: activeRoom.id,
    });
  };

  // 8. Pinned Message Toggling
  const handleTogglePin = async (messageId: number) => {
    const token = localStorage.getItem('nexo_token');
    if (!token || !activeRoom) return;

    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/messages/${messageId}/pin`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        // Broadcast via Socket
        if (socket) {
          socket.emit('pinMessage', {
            roomId: activeRoom.id,
            messageId,
            isPinned: data.isPinned,
            message: data,
          });
        }

        // Locally update list
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, isPinned: data.isPinned } : msg))
        );
        loadRoomExtras(activeRoom.id, token);
      }
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  // 9. Edit Profile Form Submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return;

    const token = localStorage.getItem('nexo_token');
    if (!token || !currentUser) return;

    try {
      const payload: any = {
        name: editName,
        avatarUrl: editAvatarUrl,
        status: editStatus,
        statusMessage: editStatusMsg,
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const updatedUser = await res.json();

      if (res.ok) {
        // Save new user info locally
        localStorage.setItem('nexo_user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setShowEditProfile(false);
        updateLocalUserPresence(updatedUser.id, editStatus, editStatusMsg, editName, editAvatarUrl);
        setEditPassword('');

        // Notify other clients via websocket
        if (socket) {
          socket.emit('changeStatus', {
            userId: updatedUser.id,
            status: editStatus,
            statusMessage: editStatusMsg,
            name: editName,
            avatarUrl: editAvatarUrl,
          });
        }
      } else {
        alert(updatedUser.message || 'Profile update failed');
      }
    } catch (err) {
      console.error('Profile update failed:', err);
    }
  };

  // 10. Status change from quick bar
  const handleQuickStatusChange = async (newStatus: string) => {
    const token = localStorage.getItem('nexo_token');
    if (!token || !currentUser) return;

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (res.ok) {
        setEditStatus(newStatus);
        localStorage.setItem('nexo_user', JSON.stringify(data));
        setCurrentUser(data);
        updateLocalUserPresence(data.id, newStatus, data.statusMessage);

        // Emit WebSockets
        if (socket) {
          socket.emit('changeStatus', {
            userId: data.id,
            status: newStatus,
            statusMessage: data.statusMessage,
          });
        }
      }
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  // 11. Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomIsGroup && !newRoomName.trim()) return;

    const token = localStorage.getItem('nexo_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoomIsGroup ? newRoomName.trim() : undefined,
          isGroup: newRoomIsGroup,
          participantIds: selectedUserIds,
          avatarUrl: newRoomIsGroup ? newRoomAvatarUrl : undefined,
        }),
      });

      const newRoom = await res.json();
      if (res.ok) {
        setShowCreateRoom(false);
        setNewRoomName('');
        setNewRoomAvatarUrl('');
        setSelectedUserIds([]);
        loadRooms(token, currentUser.id, newRoom.id);

        // Notify other clients to reload rooms via socket
        if (socket) {
          socket.emit('globalRoomUpdate', { roomId: newRoom.id });
        }
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const toggleUserSelection = (userId: number) => {
    if (!newRoomIsGroup) {
      // Start private discussion: Enforce single user selection only!
      setSelectedUserIds((prev) => prev.includes(userId) ? [] : [userId]);
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };



  // 12. DM Request Acceptance Flow Calls
  const handleAcceptDMRequest = async () => {
    if (!activeRoom) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !socket) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/accept-dm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        socket.emit('acceptDM', { roomId: activeRoom.id });
      }
    } catch (e) {
      console.error('Failed to accept DM request:', e);
    }
  };

  const handleDeclineDMRequest = async () => {
    if (!activeRoom) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !socket) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/decline-dm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        socket.emit('declineDM', { roomId: activeRoom.id });
      }
    } catch (e) {
      console.error('Failed to decline DM request:', e);
    }
  };

  // 13. Muting notifications
  const handleToggleMuteRoom = async () => {
    if (!activeRoom) return;
    const token = localStorage.getItem('nexo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/mute`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveRoom((prev: any) => prev ? { ...prev, isMuted: !prev.isMuted } : null);
        setRooms((prevRooms) =>
          prevRooms.map((r) => r.id === activeRoom.id ? { ...r, isMuted: !r.isMuted } : r)
        );
      }
    } catch (e) {
      console.error('Failed to toggle mute status:', e);
    }
  };

  // 14. Room Pinning Sidebar
  const handleTogglePinRoomSidebar = async (roomId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('nexo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${roomId}/pin-sidebar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRooms((prevRooms) =>
          prevRooms.map((r) => (r.id === roomId ? { ...r, isPinned: !r.isPinned } : r))
        );
        if (activeRoom && activeRoom.id === roomId) {
          setActiveRoom((prevActive: any) =>
            prevActive ? { ...prevActive, isPinned: !prevActive.isPinned } : null
          );
        }
      }
    } catch (err) {
      console.error('Failed to toggle sidebar pin:', err);
    }
  };

  const handleRenameGroup = async (name: string, avatarUrl?: string) => {
    if (!activeRoom || !name.trim()) return;
    const token = localStorage.getItem('nexo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), avatarUrl }),
      });
      if (res.ok) {
        const updatedRoom = await res.json();
        setActiveRoom((prev: any) => prev ? { ...prev, name: updatedRoom.name, avatarUrl: updatedRoom.avatarUrl } : null);
        setRooms((prev) => prev.map((r) => r.id === activeRoom.id ? { ...r, name: updatedRoom.name, avatarUrl: updatedRoom.avatarUrl } : r));
        if (socket) {
          socket.emit('globalRoomUpdate', { roomId: activeRoom.id });
        }
        setIsEditingGroupName(false);
      } else {
        alert('Failed to update group settings');
      }
    } catch (err) {
      console.error('Failed to update group settings:', err);
    }
  };

  const handleClearChatHistoryAction = async () => {
    if (!activeRoom) return;
    if (!confirm('Are you sure you want to clear all message history for this chat? This action cannot be undone.')) return;

    const token = localStorage.getItem('nexo_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/messages`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMessages([]);
        setPinnedMessages([]);
        setSharedFiles([]);
        if (socket) {
          socket.emit('clearChatHistory', { roomId: activeRoom.id });
        }
      } else {
        alert('Failed to clear chat history');
      }
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeRoom) return;
    if (!confirm('Are you sure you want to permanently delete this group? All messages and attachments will be deleted.')) return;
    const token = localStorage.getItem('nexo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (socket) {
          socket.emit('globalRoomUpdate', { roomId: activeRoom.id });
        }
        setActiveRoom(null);
        loadRooms(token, currentUser.id);
      } else {
        alert('Failed to delete group');
      }
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleLeaveGroupAction = async () => {
    if (!activeRoom) return;
    if (!confirm('Are you sure you want to leave this group? You will no longer be able to send or receive messages in this channel.')) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !currentUser) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (socket) {
          socket.emit('notifyMemberChange', { roomId: activeRoom.id });
        }
        setActiveRoom(null);
        loadRooms(token, currentUser.id);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to leave group');
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  const handleExportBackup = async () => {
    const token = localStorage.getItem('nexo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/rooms/backup`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Backup failed');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexo-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Failed to backup chats');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        const token = localStorage.getItem('nexo_token');
        if (!token || !currentUser) return;

        const res = await fetch(`${API_URL}/rooms/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ backup }),
        });

        if (res.ok) {
          const result = await res.json();
          alert(`Backup imported successfully!\nRooms Imported: ${result.roomsImported}\nMessages Imported: ${result.messagesImported}`);
          loadRooms(token, currentUser.id);
          setShowEditProfile(false);
        } else {
          const errData = await res.json();
          alert(errData.message || 'Failed to import backup');
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Are you sure you want to permanently delete your account? This action is IRREVERSIBLE. All your messages, profile, and data will be deleted.')) return;
    
    const token = localStorage.getItem('nexo_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Your account has been deleted.');
        handleLogout();
      } else {
        alert('Failed to delete account');
      }
    } catch (err) {
      console.error('Account deletion error:', err);
      alert('An error occurred during account deletion');
    }
  };

  const handleStartDMWithUser = async (user: any) => {
    const token = localStorage.getItem('nexo_token');
    if (!token || !currentUser) return;
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isGroup: false,
          participantIds: [user.id],
        }),
      });
      const newRoom = await res.json();
      if (res.ok) {
        setSidebarSearchQuery('');
        await loadRooms(token, currentUser.id, newRoom.id);
        if (socket) {
          socket.emit('globalRoomUpdate', { roomId: newRoom.id });
        }
      } else {
        alert('Failed to start discussion');
      }
    } catch (err) {
      console.error('Failed to start DM with user:', err);
    }
  };

  // 15. Group membership actions
  const handleAddGroupMember = async () => {
    if (!activeRoom || !selectedAddMemberId) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !socket) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: selectedAddMemberId }),
      });
      if (res.ok) {
        socket.emit('notifyMemberChange', { roomId: activeRoom.id });
        setShowAddMember(false);
        setSelectedAddMemberId(null);
      }
    } catch (e) {
      console.error('Failed to add group member:', e);
    }
  };

  const handleRemoveGroupMember = async (targetUserId: number) => {
    if (!activeRoom) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !socket) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        socket.emit('notifyMemberChange', { roomId: activeRoom.id });
      }
    } catch (e) {
      console.error('Failed to remove group member:', e);
    }
  };

  const handleToggleAdminStatus = async (targetUserId: number) => {
    if (!activeRoom) return;
    const token = localStorage.getItem('nexo_token');
    if (!token || !socket) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/members/${targetUserId}/admin`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        socket.emit('notifyMemberChange', { roomId: activeRoom.id });
      }
    } catch (e) {
      console.error('Failed to toggle admin status:', e);
    }
  };

  const handleInviteUserToCall = async (userId: number) => {
    if (!activeRoom || !currentUser || !activeRoom.isGroup) return;
    const token = localStorage.getItem('nexo_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/rooms/${activeRoom.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        if (socket) {
          socket.emit('notifyMemberChange', { roomId: activeRoom.id });

          // Wait 1.5 seconds for the user to sync and join socket room, then invite
          setTimeout(() => {
            socket.emit('videoCallSignal', {
              roomId: activeRoom.id,
              senderId: currentUser.id,
              senderName: currentUser.name,
              type: 'offer',
              callType: callType,
              signal: null,
            });
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Failed to invite user to group call:', err);
    }
  };

  // 16. Message Edits & Deletes
  const startEditMessage = (msgId: number, content: string) => {
    setEditingMessageId(msgId);
    setEditingText(content);
  };

  const handleSaveEdit = (messageId: number) => {
    if (!editingText.trim() || !socket || !activeRoom) return;
    socket.emit('editMessage', {
      userId: currentUser.id,
      messageId,
      content: editingText.trim(),
      roomId: activeRoom.id,
    });
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    if (!socket || !activeRoom) return;
    socket.emit('deleteMessage', {
      userId: currentUser.id,
      messageId,
      roomId: activeRoom.id,
    });
  };

  const handleCopyText = (messageId: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  // Pinned Message Redirect
  const handleScrollToMessage = (messageId: number) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-indigo-50/70', 'ring-2', 'ring-indigo-300', 'rounded-2xl', 'transition-all', 'duration-300', 'scale-[1.02]');
      setTimeout(() => {
        element.classList.remove('bg-indigo-50/70', 'ring-2', 'ring-indigo-300', 'rounded-2xl', 'transition-all', 'duration-300', 'scale-[1.02]');
      }, 2000);
    }
  };

  // UI Helpers
  const avatarColors: { [key: string]: string } = {
    RS: 'bg-rose-500 text-white',
    AM: 'bg-amber-500 text-white',
    KS: 'bg-emerald-500 text-white',
    SJ: 'bg-fuchsia-500 text-white',
    PP: 'bg-indigo-500 text-white',
    RK: 'bg-orange-500 text-white',
      AR: 'bg-cyan-500 text-white',
  };

  const avatarOptions = Object.keys(avatarColors);

  const getAvatarColor = (code: string) => {
    if (avatarColors[code]) return avatarColors[code];
    // Hash other strings to assign a consistent, beautiful color
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = Object.values(avatarColors);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderAvatar = (avatarUrl: string | null, name: string, sizeClass = 'w-8 h-8 text-xs') => {
    const initials = getInitials(name);
    const isUrl = avatarUrl && (
      avatarUrl.startsWith('http') || 
      avatarUrl.startsWith('/') || 
      avatarUrl.startsWith('data:') ||
      avatarUrl.includes('.png') ||
      avatarUrl.includes('.jpg') ||
      avatarUrl.includes('.jpeg') ||
      avatarUrl.includes('.webp')
    );

    if (isUrl) {
      return (
        <img
          src={avatarUrl.startsWith('/') && !avatarUrl.startsWith('data:') ? `${API_URL}${avatarUrl}` : avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClass.split(' ')[0]} ${sizeClass.split(' ')[1]} rounded-full object-cover shrink-0`}
        />
      );
    }

    // Dynamic initials: Always render initials derived from current name.
    // Use avatarUrl color key if present, otherwise hash.
    const colorCode = avatarUrl || initials;
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 ${getAvatarColor(colorCode)}`}>
        {initials}
      </div>
    );
  };

  const formatMessageText = (text: string, isMe: boolean) => {
    if (!text) return '';

    const blocks = text.split(/(```[\s\S]*?```)/g);
    return blocks.map((block, index) => {
      if (block.startsWith('```') && block.endsWith('```')) {
        const lines = block.slice(3, -3).split('\n');
        const lang = lines[0].trim();
        const code = lines.slice(1).join('\n').trim();

        return (
          <div key={index} className="my-2 rounded-xl overflow-hidden text-left bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800 shadow-md">
            <div className="bg-slate-800 px-4 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex justify-between items-center">
              <span>{lang || 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white transition-colors cursor-pointer text-[9px] font-bold"
              >
                Copy
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto scrollbar-thin">
              <code className="block whitespace-pre">{code}</code>
            </pre>
          </div>
        );
      }

      const parseInline = (input: string) => {
        let parts = [{ text: input, bold: false, italic: false, code: false }];

        let newParts: typeof parts = [];
        for (const p of parts) {
          if (p.code) { newParts.push(p); continue; }
          const sub = p.text.split(/`([^`]+)`/g);
          for (let i = 0; i < sub.length; i++) {
            if (i % 2 === 1) {
              newParts.push({ text: sub[i], bold: p.bold, italic: p.italic, code: true });
            } else if (sub[i]) {
              newParts.push({ text: sub[i], bold: p.bold, italic: p.italic, code: false });
            }
          }
        }
        parts = newParts;

        newParts = [];
        for (const p of parts) {
          if (p.code || p.bold) { newParts.push(p); continue; }
          const sub = p.text.split(/\*\*([^*]+)\*\*/g);
          for (let i = 0; i < sub.length; i++) {
            if (i % 2 === 1) {
              newParts.push({ text: sub[i], bold: true, italic: p.italic, code: false });
            } else if (sub[i]) {
              newParts.push({ text: sub[i], bold: false, italic: p.italic, code: false });
            }
          }
        }
        parts = newParts;

        newParts = [];
        for (const p of parts) {
          if (p.code || p.italic) { newParts.push(p); continue; }
          const sub = p.text.split(/\*([^*]+)\*/g);
          for (let i = 0; i < sub.length; i++) {
            if (i % 2 === 1) {
              newParts.push({ text: sub[i], bold: p.bold, italic: true, code: false });
            } else if (sub[i]) {
              newParts.push({ text: sub[i], bold: p.bold, italic: false, code: false });
            }
          }
        }
        parts = newParts;

        const renderTextWithLinksAndMentions = (text: string) => {
          if (!text) return '';
          const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
          const tokens = text.split(urlRegex);

          return tokens.map((token, tokenIdx) => {
            const isUrl = urlRegex.test(token);
            if (isUrl) {
              const href = token.startsWith('www.') ? `https://${token}` : token;
              return (
                <a
                  key={`link-${tokenIdx}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${isMe ? 'text-indigo-200 hover:text-white underline' : 'text-indigo-650 hover:underline underline'} font-semibold break-all`}
                >
                  {token}
                </a>
              );
            }

            const participants = activeRoom?.participants || [];
            const memberNames = participants
              .map((p: any) => p.user?.name)
              .filter(Boolean)
              .sort((a: string, b: string) => b.length - a.length);

            if (memberNames.length === 0) {
              return token;
            }

            const escapedNames = memberNames.map((name: string) =>
              name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            );
            const mentionRegex = new RegExp(`@(${escapedNames.join('|')})`, 'g');
            const subTokens = token.split(mentionRegex);

            if (subTokens.length <= 1) {
              return token;
            }

            return subTokens.map((subToken, subTokenIdx) => {
              if (subTokenIdx % 2 === 1) {
                return (
                  <span
                    key={`mention-${subTokenIdx}`}
                    className="font-extrabold text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/70 border border-indigo-200/20 px-1 py-0.5 rounded"
                  >
                    @{subToken}
                  </span>
                );
              }
              return subToken;
            });
          });
        };

        return parts.map((p, idx) => {
          if (p.code) {
            return (
              <code
                key={idx}
                className={`font-mono text-xs px-1.5 py-0.5 rounded ${isMe ? 'bg-indigo-700 text-indigo-100 border border-indigo-500/20' : 'bg-slate-100 text-rose-600 border border-slate-200'
                  }`}
              >
                {p.text}
              </code>
            );
          }

          let el: React.ReactNode = renderTextWithLinksAndMentions(p.text);
          if (p.bold) el = <strong key={idx} className="font-extrabold">{el}</strong>;
          if (p.italic) el = <em key={idx} className="italic">{el}</em>;
          return <span key={idx}>{el}</span>;
        });
      };

      return <span key={index}>{parseInline(block)}</span>;
    });
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'away':
        return 'bg-amber-500';
      case 'dnd':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const activeTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Several people are typing...';
  };

  // Search filter implementation
  const filteredMessages = messages.filter((msg) =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Workspace User Search inside create room modal
  const filteredWorkspaceUsers = allUsers.filter((u) => {
    if (u.id === currentUser?.id) return false;
    
    // If search query is empty, do not show any user by default in the selection directory
    if (workspaceSearchQuery.trim() === '') {
      return false;
    }

    return ((u.name || '').toLowerCase().includes(workspaceSearchQuery.toLowerCase())) ||
           ((u.email || '').toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  });

  // Group Admin checks
  const isCurrentUserAdmin = activeRoom?.isGroup && activeRoom.participants?.find((p: any) => p.user && Number(p.user.id) === Number(currentUser?.id))?.isAdmin;

  // Single participant check for Group calls
  const showCallOption = activeRoom && (!activeRoom.isGroup || (activeRoom.participants && activeRoom.participants.length > 1));

  // Sidebar sorting / partitions & filtering
  const filteredRooms = rooms.filter((r) => {
    const searchLower = sidebarSearchQuery.toLowerCase();
    let matchesQuery = (r.name || '').toLowerCase().includes(searchLower);

    // For DMs, also match by participant email
    if (!r.isGroup) {
      const otherPart = r.participants?.find((p: any) => p.user && Number(p.user.id) !== Number(currentUser?.id));
      if (otherPart && (otherPart.user?.email || '').toLowerCase().includes(searchLower)) {
        matchesQuery = true;
      }
    }

    if (sidebarSearchQuery.trim() === '') return matchesQuery;
    // If sidebar search is active, do not include group rooms (channels)
    return matchesQuery && !r.isGroup;
  });
  const pinnedRooms = filteredRooms.filter((r) => r.isPinned);
  const unpinnedRooms = filteredRooms.filter((r) => !r.isPinned);

  // New discussions users search list (workspace members search in sidebar)
  const newDiscussionUsers = sidebarSearchQuery.trim()
    ? allUsers.filter((user) => {
      if (user.id === currentUser?.id) return false;
      const searchLower = sidebarSearchQuery.toLowerCase();
      const matchesQuery =
        (user.name || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower);
      if (!matchesQuery) return false;
      const hasDM = rooms.some(
        (r) => !r.isGroup && r.participants?.some((p: any) => p.user?.id === user.id)
      );
      return !hasDM;
    })
    : [];

  return (
    <div className={`flex h-screen bg-slate-100 dark:bg-[#070b13] text-slate-800 dark:text-slate-100 font-sans overflow-hidden relative transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''
      }`}>

      {/* Mobile Sidebar Backdrop Overlay */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in"
        />
      )}

      {/* 1. Left Sidebar: Channels & DMs */}
      <aside className={`
        fixed inset-y-0 left-0 z-45 w-full md:w-64 flex flex-col shrink-0 transition-all duration-300 md:static md:translate-x-0
        border-r border-slate-200 dark:border-slate-800
        bg-slate-100 text-slate-700 dark:bg-[#0b0f19] dark:text-slate-300
        ${activeRoom ? (showMobileSidebar ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full') : 'translate-x-0'}
      `}>

        {/* Workspace Brand Header */}
        <div
          onClick={() => {
            setActiveRoom(null);
            setShowMobileSidebar(false);
          }}
          className="p-4 border-b flex justify-between items-center bg-slate-200/50 dark:bg-[#070b13] border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-[#0c111c] transition-colors"
          title="Open Welcome Dashboard"
        >
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="NexoChat Logo" className="w-8 h-8 object-contain rounded-lg shadow-md" />
            <div>
              <h2 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-wide uppercase">Nexo Chat</h2>
              <span className="text-[10px] text-slate-500 font-medium">Nexozone Workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'} border-2 border-slate-200/50 dark:border-[#070b13] animate-pulse`}></span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileSidebar(false);
              }}
              className="md:hidden p-1.5 hover:bg-slate-400 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
              title="Close Sidebar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar Search Bar */}
        <div className="p-3 border-b bg-slate-200/20 dark:bg-[#070b13]/40 border-slate-200 dark:border-slate-800/80">
          <div className="relative">
            <input
              type="text"
              placeholder="Search rooms or members..."
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200"
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
            {sidebarSearchQuery && (
              <button
                type="button"
                onClick={() => setSidebarSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-355 text-[10px] font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">

          {/* NEW DISCUSSION SEARCH RESULTS */}
          {newDiscussionUsers.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center px-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider gap-1">
                <Search size={10} className="text-indigo-400" />
                <span>Search Directory</span>
              </div>
              <div className="space-y-0.5">
                {newDiscussionUsers.map((user) => {
                  const initials = user.avatarUrl || getInitials(user.name);
                  const status = user.status || 'offline';
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleStartDMWithUser(user)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition cursor-pointer group hover:bg-slate-800/50 hover:text-slate-200"
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(user.avatarUrl, user.name, 'w-6.5 h-6.5 text-[10px]')}
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0b0f19] ${getStatusColor(status)}`}></span>
                      </div>
                      <div className="truncate flex-1 min-w-0">
                        <span className="truncate block font-bold text-slate-200">{user.name}</span>
                        <span className="text-[9px] text-slate-500 truncate block">{user.email}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PINNED ROOMS SECTION */}
          {pinnedRooms.length > 0 && (
            <div>
              <div className="flex items-center px-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider gap-1">
                <Pin size={10} className="fill-indigo-400 text-indigo-400 rotate-45" />
                <span>Pinned</span>
              </div>
              <div className="space-y-0.5">
                {pinnedRooms.map((room) => {
                  const isActive = activeRoom?.id === room.id;
                  const initials = room.avatarUrl || '??';
                  const hasActiveCall = activeCalls[room.id] !== undefined;

                  // Check status & typing for DMs
                  const otherPart = room.participants?.find((p: any) => p.user && Number(p.user.id) !== Number(currentUser?.id));
                  const status = otherPart?.user?.status || 'offline';
                  const isTyping = Object.keys(typingUsers).includes(String(otherPart?.user?.id));

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition cursor-pointer group ${isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(room.avatarUrl, room.name || 'Group', 'w-6.5 h-6.5 text-[10px]')}
                        {!room.isGroup && (
                          <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0b0f19] ${getStatusColor(status)}`}></span>
                        )}
                      </div>

                      <div className="truncate flex-grow min-w-0">
                        <span className="truncate block">{room.name}</span>
                        {!room.isGroup && sidebarSearchQuery.trim() !== '' && otherPart?.user?.email && (
                          <span className={`text-[9px] truncate block ${isActive ? 'text-indigo-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {otherPart.user.email}
                          </span>
                        )}
                      </div>

                      {hasActiveCall && (
                        <Video size={12} className="text-emerald-500 animate-pulse shrink-0 ml-1" />
                      )}

                      {isTyping && (
                        <span className="flex gap-0.5 items-center bg-indigo-900/60 px-1.5 py-0.5 rounded-full shrink-0 mr-1 animate-pulse" title="Typing...">
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                      )}

                      {/* Unread Counter Badge */}
                      {room.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-bounce">
                          {room.unreadCount}
                        </span>
                      )}

                      {/* Unpin Action */}
                      <span
                        onClick={(e) => handleTogglePinRoomSidebar(room.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded transition shrink-0 ml-1 cursor-pointer"
                        title="Unpin from sidebar"
                      >
                        <Pin size={11} className="fill-indigo-400 text-indigo-400 rotate-45" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHANNELS Section */}
          <div>
            <div className="flex justify-between items-center px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Channels</span>
              <button
                onClick={() => {
                  setNewRoomIsGroup(true);
                  setShowCreateRoom(true);
                }}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-0.5">
              {unpinnedRooms
                .filter((r) => r.isGroup)
                .map((room) => {
                  const isActive = activeRoom?.id === room.id;
                  const hasActiveCall = activeCalls[room.id] !== undefined;
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition cursor-pointer group ${isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      <div className="relative shrink-0 mr-0.5">
                        {renderAvatar(room.avatarUrl, room.name || 'Group', 'w-6.5 h-6.5 text-[10px]')}
                      </div>
                      <span className="truncate flex-1">{room.name}</span>

                      {hasActiveCall && (
                        <Video size={12} className="text-emerald-500 animate-pulse shrink-0 ml-1" />
                      )}

                      {/* Unread Counter Badge */}
                      {room.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          {room.unreadCount}
                        </span>
                      )}

                      {room.isMuted && <BellOff size={10} className="text-slate-500 shrink-0 ml-1" />}

                      {/* Pin Trigger */}
                      <span
                        onClick={(e) => handleTogglePinRoomSidebar(room.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded transition shrink-0 ml-1 cursor-pointer"
                        title="Pin to sidebar"
                      >
                        <Pin size={11} className="text-slate-400" />
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* DIRECT MESSAGES Section */}
          <div>
            <div className="flex justify-between items-center px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Direct Messages</span>
              <button
                onClick={() => {
                  setNewRoomIsGroup(false);
                  setShowCreateRoom(true);
                }}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-0.5">
              {unpinnedRooms
                .filter((r) => !r.isGroup)
                .map((room) => {
                  const isActive = activeRoom?.id === room.id;
                  const initials = room.avatarUrl || '??';
                  const hasActiveCall = activeCalls[room.id] !== undefined;

                  // Check status from participants
                  const otherPart = room.participants?.find((p: any) => p.user && Number(p.user.id) !== Number(currentUser?.id));
                  const status = otherPart?.user?.status || 'offline';
                  const isPending = room.dmStatus === 'pending';
                  const isTyping = Object.keys(typingUsers).includes(String(otherPart?.user?.id));

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-left transition cursor-pointer group ${isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(room.avatarUrl, room.name, 'w-6.5 h-6.5 text-[10px]')}
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0b0f19] ${getStatusColor(status)}`}></span>
                      </div>

                      <div className="truncate flex-grow min-w-0">
                        {isTyping ? (
                          <span className="text-[10px] text-indigo-400 font-bold animate-pulse">typing...</span>
                        ) : (
                          <>
                            <span className={`truncate block ${isPending ? (isActive ? 'text-indigo-200/90 italic' : 'text-slate-400 dark:text-slate-500 italic') : ''}`}>
                              {room.name} {isPending && '(request)'}
                            </span>
                            {sidebarSearchQuery.trim() !== '' && otherPart?.user?.email && (
                              <span className={`text-[9px] truncate block ${isActive ? 'text-indigo-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                {otherPart.user.email}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {hasActiveCall && (
                        <Video size={12} className="text-emerald-500 animate-pulse shrink-0 ml-1" />
                      )}

                      {/* Unread Counter Badge */}
                      {room.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          {room.unreadCount}
                        </span>
                      )}

                      {room.isMuted && <BellOff size={10} className="text-slate-500 shrink-0 ml-1" />}

                      {/* Pin Trigger */}
                      <span
                        onClick={(e) => handleTogglePinRoomSidebar(room.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded transition shrink-0 ml-1 cursor-pointer"
                        title="Pin to sidebar"
                      >
                        <Pin size={11} className="text-slate-400" />
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

        </div>

        {/* User profile section at the bottom */}
        {currentUser && (
          <div className="p-3 bg-slate-200/50 dark:bg-[#070b13] border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 transition-colors duration-300">

            {/* Status dropdown */}
            <div className="flex gap-1 items-center justify-between px-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Presence:</span>
              <div className="flex gap-1.5">
                {['online', 'away', 'dnd'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleQuickStatusChange(st)}
                    className={`w-3.5 h-3.5 rounded-full border transition hover:scale-110 cursor-pointer ${currentUser.status === st
                      ? 'border-slate-400 dark:border-white scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                      } ${getStatusColor(st)}`}
                    title={`Set status to ${st}`}
                  ></button>
                ))}
              </div>
            </div>

            {/* Profile info block */}
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative shrink-0">
                  {renderAvatar(currentUser.avatarUrl, currentUser.name, 'w-8 h-8 text-xs')}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-200 dark:border-[#070b13] ${getStatusColor(currentUser.status || 'online')}`}></span>
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</div>
                  <div className="text-[9px] text-slate-500 truncate italic">
                    {currentUser.statusMessage || `Status: ${currentUser.status}`}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-0.5">
                {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                  <button
                    onClick={() => router.push('/admin')}
                    title="Admin Dashboard"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <Shield size={14} />
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  title="Toggle Theme"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
                <button
                  onClick={() => setShowEditProfile(true)}
                  title="Edit Profile"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>

          </div>
        )}
      </aside>

      {/* 2. Center Feed */}
      <section className={`flex-1 bg-white dark:bg-[#070b13] flex flex-col min-w-0 shadow-inner transition-colors duration-300 ${
        activeRoom ? 'flex' : 'hidden md:flex'
      }`}>
        {activeRoom ? (
          <>
            {/* Header */}
            <header className="px-4 md:px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19] shrink-0 transition-colors duration-300">
              <div className="overflow-hidden flex items-center gap-2.5">
                {/* Mobile Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoom(null);
                    setShowMobileSidebar(false);
                  }}
                  className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition cursor-pointer shrink-0"
                  title="Back to discussion list"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="relative shrink-0 mr-1">
                  {renderAvatar(activeRoom.avatarUrl, activeRoom.name || 'Group', 'w-8 h-8 text-xs')}
                  {!activeRoom.isGroup && (() => {
                    const otherPart = activeRoom.participants?.find((p: any) => p.user && Number(p.user.id) !== Number(currentUser?.id));
                    const status = otherPart?.user?.status || 'offline';
                    return (
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-[#0b0f19] ${getStatusColor(status)}`}></span>
                    );
                  })()}
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{activeRoom.name}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {/* Search Bar in Header - Desktop */}
                <div className="relative hidden md:block">
                  <input
                    type="text"
                    placeholder="Search in conversation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-7 py-1.5 border border-slate-200 dark:border-slate-800 rounded-full text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-36 focus:w-56 transition-all duration-300 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Mute Notification Toggle - Desktop */}
                <button
                  onClick={handleToggleMuteRoom}
                  className={`hidden md:inline-flex p-2 rounded-full transition cursor-pointer ${activeRoom.isMuted ? 'text-rose-500 bg-rose-50 hover:bg-rose-100' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  title={activeRoom.isMuted ? 'Unmute Room Notifications' : 'Mute Room Notifications'}
                >
                  {activeRoom.isMuted ? <BellOff size={17} /> : <Bell size={17} />}
                </button>

                {/* WebRTC Video & Voice Call - Desktop */}
                {showCallOption && (
                  <div className="hidden md:flex gap-1.5">
                    {activeCalls[activeRoom.id] ? (
                      <button
                        onClick={() => {
                          const callInfo = activeCalls[activeRoom.id];
                          setCallType(callInfo.callType);
                          setCallRoomId(activeRoom.id);
                          setInCall(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition flex items-center justify-center gap-1.5 text-xs font-bold shadow-md cursor-pointer animate-pulse"
                        title="Join Active Call"
                      >
                        {activeCalls[activeRoom.id].callType === 'voice' ? <Phone size={14} className="fill-white" /> : <Video size={14} className="fill-white" />}
                        Join Call
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setCallType('voice');
                            setCallRoomId(activeRoom.id);
                            setInCall(true);
                          }}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 active:bg-indigo-100 dark:active:bg-indigo-900/40 rounded-full transition flex items-center justify-center gap-1.5 text-xs font-bold hover:shadow-sm cursor-pointer"
                          title="Start Voice Call"
                        >
                          <Phone size={15} /> Voice Call
                        </button>
                        <button
                          onClick={() => {
                            setCallType('video');
                            setCallRoomId(activeRoom.id);
                            setInCall(true);
                          }}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 active:bg-indigo-100 dark:active:bg-indigo-900/40 rounded-full transition flex items-center justify-center gap-1.5 text-xs font-bold hover:shadow-sm cursor-pointer"
                          title="Start Video Call"
                        >
                          <Video size={17} /> Call
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Theme toggle - Visible everywhere */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition cursor-pointer ${theme === 'dark'
                    ? 'text-amber-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  title="Toggle theme"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* Right panel toggle - Desktop */}
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`hidden md:inline-flex p-2 rounded-full transition cursor-pointer ${showRightPanel ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  title="Toggle details panel"
                >
                  <Info size={18} />
                </button>

                {/* 3-Dot Dropdown Menu - Mobile */}
                <div className="relative md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowMobileHeaderMenu(!showMobileHeaderMenu)}
                    className={`p-2 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${showMobileHeaderMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : ''
                      }`}
                    title="More options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {showMobileHeaderMenu && (
                    <>
                      {/* Backdrop overlay */}
                      <div
                        onClick={() => setShowMobileHeaderMenu(false)}
                        className="fixed inset-0 z-30 bg-transparent"
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 py-1.5 animate-scale-up">
                        {/* Search bar inside dropdown */}
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-7 pr-6 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300"
                            />
                            <Search size={11} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px]"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Call options inside dropdown */}
                        {showCallOption && (
                          <div className="p-1 border-b border-slate-100 dark:border-slate-800/80 space-y-0.5">
                            {activeCalls[activeRoom.id] ? (
                              <button
                                onClick={() => {
                                  const callInfo = activeCalls[activeRoom.id];
                                  setCallType(callInfo.callType);
                                  setCallRoomId(activeRoom.id);
                                  setInCall(true);
                                  setShowMobileHeaderMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-left cursor-pointer"
                              >
                                {activeCalls[activeRoom.id].callType === 'voice' ? <Phone size={13} /> : <Video size={13} />}
                                Join Active Call
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setCallType('voice');
                                    setCallRoomId(activeRoom.id);
                                    setInCall(true);
                                    setShowMobileHeaderMenu(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition text-left cursor-pointer"
                                >
                                  <Phone size={13} /> Voice Call
                                </button>
                                <button
                                  onClick={() => {
                                    setCallType('video');
                                    setCallRoomId(activeRoom.id);
                                    setInCall(true);
                                    setShowMobileHeaderMenu(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition text-left cursor-pointer"
                                >
                                  <Video size={13} /> Video Call
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div className="p-1 space-y-0.5">
                          {/* Mute Room Toggle */}
                          <button
                            onClick={() => {
                              handleToggleMuteRoom();
                              setShowMobileHeaderMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition text-left cursor-pointer"
                          >
                            {activeRoom.isMuted ? <BellOff size={13} /> : <Bell size={13} />}
                            {activeRoom.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                          </button>

                          {/* Info Panel Details Toggle */}
                          <button
                            onClick={() => {
                              setShowRightPanel(!showRightPanel);
                              setShowMobileHeaderMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition text-left cursor-pointer"
                          >
                            <Info size={13} />
                            {showRightPanel ? 'Hide Details' : 'Show Details'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-[#070b13]/40 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {filteredMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  {searchQuery ? 'No messages matched your search query.' : 'This is the beginning of your chat history.'}
                </div>
              )}
              {/* Call History Log removed from chat area */}
              {filteredMessages.map((msg, index) => {
                const isMe = msg.userId === currentUser?.id;
                const initials = msg.user.avatarUrl || getInitials(msg.user.name);

                // Read Receipts logic: Check if other participants read this message
                const otherParticipants = activeRoom.participants?.filter((p: any) => p.userId !== msg.userId) || [];
                const isReadByOthers = otherParticipants.length > 0 && otherParticipants.some((p: any) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt));

                const isCallStatus = msg.content.startsWith('📞 Video call');

                const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                const showDateSeparator = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                if (isCallStatus) {
                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-6">
                          <div className="border-t border-slate-200/70 flex-1"></div>
                          <span className="bg-slate-100/80 text-slate-500 font-bold px-3 py-1 rounded-full text-[10px] mx-4 uppercase tracking-wider shadow-sm border border-slate-200/50">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                          <div className="border-t border-slate-200/70 flex-1"></div>
                        </div>
                      )}
                      <div id={`msg-${msg.id}`} className="flex justify-center w-full my-2 animate-fade-in">
                        <div className="bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/50 text-indigo-950 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm text-xs font-bold max-w-md mx-auto">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Video size={12} className="fill-white" />
                          </div>
                          <div className="flex-1 text-slate-700 font-medium">
                            <span className="font-extrabold text-indigo-950">{msg.user.name}</span>{' '}
                            {msg.content.replace('📞 Video call ', '')}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={msg.id || index}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-6">
                        <div className="border-t border-slate-200/70 dark:border-slate-800 flex-1"></div>
                        <span className="bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-3 py-1 rounded-full text-[10px] mx-4 uppercase tracking-wider shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                        <div className="border-t border-slate-200/70 dark:border-slate-800 flex-1"></div>
                      </div>
                    )}
                    <div id={`msg-${msg.id}`} className={`flex gap-3 group items-start relative ${isMe ? 'flex-row-reverse' : ''}`}>

                      {/* Avatar */}
                      {renderAvatar(msg.user.avatarUrl, msg.user.name, 'w-8 h-8 text-xs')}

                      {/* Bubble body */}
                      <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end flex flex-col' : ''}`}>
                        <div className={`flex items-center gap-2 text-xs text-slate-400 ${isMe ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-700 dark:text-slate-400">{msg.user.name}</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!msg.isDeleted && (isMe || activeRoom.isGroup) && (() => {
                            const seenBy = otherParticipants.filter((p: any) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt));
                            const remaining = otherParticipants.filter((p: any) => !p.lastReadAt || new Date(p.lastReadAt) < new Date(msg.createdAt));
                            return (
                              <div className="relative group/receipt cursor-help flex items-center">
                                <CheckCheck size={14} className={isReadByOthers ? "text-indigo-500 font-extrabold" : "text-slate-400"} />
                                
                                {/* Custom Read Receipts Hover Card */}
                                <div className="absolute right-0 bottom-full mb-1 w-64 bg-slate-900/95 dark:bg-slate-955/95 backdrop-blur-sm text-white text-[11px] rounded-xl p-2.5 shadow-2xl border border-slate-800 z-50 hidden group-hover/receipt:block pointer-events-none transition-all duration-200">
                                  <div className="font-extrabold text-slate-400 mb-1 border-b border-slate-850 pb-1 uppercase tracking-wider text-[9px]">
                                    Message Status
                                  </div>
                                  <div className="mb-1.5">
                                    <span className="text-emerald-400 font-extrabold block text-[9px] uppercase tracking-wide">Seen by ({seenBy.length}):</span>
                                    <span className="text-slate-200 block leading-tight font-medium">
                                      {seenBy.map((p: any) => p.user?.name).join(', ') || 'No one yet'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-extrabold block text-[9px] uppercase tracking-wide">Remaining ({remaining.length}):</span>
                                    <span className="text-slate-355 block leading-tight font-medium">
                                      {remaining.map((p: any) => p.user?.name).join(', ') || 'None'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {msg.isPinned && (
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 shadow-sm border border-indigo-100/30 dark:border-indigo-900/30">
                              <Pin size={8} /> Pinned
                            </span>
                          )}
                        </div>

                        {/* Reply Quoted Preview */}
                        {msg.parent && (
                          <div className={`border-l-2 border-indigo-500 rounded-lg p-2.5 text-xs max-w-full truncate bg-slate-200/60 dark:bg-[#0b0f19]/80 ${isMe ? 'mr-2' : 'ml-2'
                            }`}>
                            <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">{msg.parent.user?.name}</span>
                            <span className="text-slate-600 dark:text-slate-400 italic whitespace-nowrap">{msg.parent.content}</span>
                          </div>
                        )}

                        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group transition-colors duration-250 ${msg.isDeleted
                          ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-tl-none italic'
                          : isMe
                            ? 'bg-indigo-600 dark:bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                          }`}>

                          {/* Dynamic edit display or standard message */}
                          {editingMessageId === msg.id ? (
                            <div className="space-y-2 min-w-[200px] py-1 text-slate-800">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full p-2 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white bg-white dark:bg-[#070b13]"
                                rows={2}
                                spellCheck={true}
                                autoCorrect="on"
                                autoComplete="on"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="whitespace-pre-wrap leading-relaxed break-words">{formatMessageText(msg.content, isMe)}</div>
                              {msg.isEdited && !msg.isDeleted && (
                                <span className={`text-[9px] block mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  (edited)
                                </span>
                              )}
                            </>
                          )}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && !msg.isDeleted && (
                            <div className="mt-3 space-y-2 border-t border-slate-200/20 pt-2 shrink-0">
                              {msg.attachments.map((att: any) => {
                                const isImg = att.fileType.startsWith('image/');
                                return (
                                  <div key={att.id} className="mt-1">
                                    {isImg ? (
                                      <div className="max-w-xs rounded-lg overflow-hidden border border-slate-300/50 shadow-sm mt-1 bg-slate-900">
                                        <img
                                          src={`${API_URL}${att.fileUrl}`}
                                          alt={att.fileName}
                                          className="max-h-48 w-auto mx-auto object-contain cursor-zoom-in"
                                          onClick={() => window.open(`${API_URL}${att.fileUrl}`, '_blank')}
                                        />
                                      </div>
                                    ) : (
                                      <div className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs max-w-xs shadow-sm ${isMe ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}>
                                        <FileText size={20} className={isMe ? 'text-indigo-300' : 'text-indigo-600'} />
                                        <div className="overflow-hidden flex-1">
                                          <div className="font-bold truncate">{att.fileName}</div>
                                          <div className={isMe ? 'text-indigo-200' : 'text-slate-400'}>{formatBytes(att.fileSize)}</div>
                                        </div>
                                        <button
                                          onClick={() => window.open(`${API_URL}${att.fileUrl}`, '_blank')}
                                          className={`px-3 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${isMe ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                                            }`}
                                        >
                                          Open
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
                            <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : ''}`}>
                              {Object.entries(
                                msg.reactions.reduce((acc: any, curr: any) => {
                                  acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]: [string, any]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${msg.reactions.some((r: any) => r.userId === currentUser.id && r.emoji === emoji)
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                  {emoji} <span className="ml-0.5 text-[10px] font-normal">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Float Action Menu (Emoji, Edit, Delete, Reply, Copy) */}
                        {!msg.isDeleted && (
                          <div className={`opacity-0 group-hover:opacity-100 transition duration-150 absolute top-[-15px] flex bg-white border border-slate-200 shadow-md rounded-full px-2.5 py-1 gap-2 z-10 ${isMe ? 'left-4' : 'right-4'
                            }`}>
                            {['👍', '🔥', '❤️', '👏'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="hover:scale-125 transition text-sm px-0.5 py-0.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}

                            <div className="w-[1px] bg-slate-200 my-1"></div>

                            {/* Reply Button */}
                            <button
                              onClick={() => setReplyToMessage(msg)}
                              className="hover:scale-115 text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                              title="Reply to message"
                            >
                              <CornerUpLeft size={13} />
                            </button>

                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className={`hover:scale-115 transition p-0.5 cursor-pointer ${copiedMessageId === msg.id ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                                }`}
                              title="Copy message content"
                            >
                              {copiedMessageId === msg.id ? <CheckCheck size={13} /> : <Copy size={13} />}
                            </button>

                            {/* Edit / Delete (Me only) */}
                            {isMe && (
                              <>
                                <button
                                  onClick={() => startEditMessage(msg.id, msg.content)}
                                  className="hover:scale-115 text-slate-400 hover:text-indigo-600 transition p-0.5 cursor-pointer"
                                  title="Edit message"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="hover:scale-115 text-slate-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                                  title="Delete message"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}

                            <div className="w-[1px] bg-slate-200 my-1"></div>

                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className={`hover:scale-125 transition p-1 rounded-full cursor-pointer ${msg.isPinned ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                              title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                            >
                              <Pin size={13} className={msg.isPinned ? 'fill-indigo-600' : ''} />
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Typing indicators inside chat feed stream */}
              {Object.entries(typingUsers).map(([userId, userName]: [string, any]) => {
                const initials = getInitials(userName);
                return (
                  <div key={userId} className="flex gap-3 items-start animate-pulse">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(initials)}`}>
                      {initials}
                    </div>
                    <div className="bg-slate-100 text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 shadow-sm">
                      <span className="font-bold text-slate-700 text-xs">{userName}</span>
                      <span className="text-[11px] text-slate-400">typing</span>
                      <span className="flex gap-0.5 ml-1">
                        <span className="w-1.2 h-1.2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.2 h-1.2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.2 h-1.2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Pane or Request Card */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b13] shrink-0 transition-colors duration-300">

              {/* Typing indications text */}
              <div className="h-5 text-xs text-slate-400 italic px-2 mb-1">
                {activeTypingText()}
              </div>

              {/* Chat Request Lock Check */}
              {!activeRoom.isGroup && activeRoom.dmStatus === 'pending' ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-inner">
                  <div className="text-center md:text-left">
                    <h4 className="text-sm font-bold text-slate-900">Workspace Chat Request</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentUser?.id === activeRoom.dmRequesterId
                        ? 'Waiting for recipient to accept your chat invitation before you can message.'
                        : 'Wants to message you. Accept their chat request to start collaborating.'}
                    </p>
                  </div>
                  {currentUser?.id !== activeRoom.dmRequesterId && (
                    <div className="flex gap-2.5 shrink-0">
                      <button
                        onClick={handleAcceptDMRequest}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={handleDeclineDMRequest}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer"
                      >
                        Ignore/Decline
                      </button>
                    </div>
                  )}
                </div>
              ) : !activeRoom.isGroup && activeRoom.dmStatus === 'declined' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400 italic">
                  This chat invitation was declined.
                </div>
              ) : (
                <>
                  {/* Quoting display if replying */}
                  {replyToMessage && (
                    <div className="flex justify-between items-center bg-indigo-50 border-l-4 border-indigo-500 px-3 py-2 rounded-t-xl text-xs text-indigo-950 font-medium animate-slide-down mb-1 mx-1 shadow-sm">
                      <div className="truncate flex-1">
                        Replying to <span className="font-bold">{replyToMessage.user.name}</span>: <span className="italic">{replyToMessage.content}</span>
                      </div>
                      <button onClick={() => setReplyToMessage(null)} className="text-slate-400 hover:text-slate-600 ml-2 font-bold cursor-pointer">
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Uploading progress indicator */}
                  {uploading && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2.5 mb-2 flex items-center gap-3 border border-slate-200 dark:border-slate-700 animate-pulse mx-1">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Upload size={14} className="animate-bounce text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <span>Uploading Attachment...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={triggerFileUpload}
                      disabled={uploading}
                      className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                      title="Upload file or photo"
                    >
                      <Paperclip size={18} className={uploading ? 'animate-spin' : ''} />
                    </button>

                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-[#070b13] rounded-xl px-4 py-2 transition flex items-end shadow-sm relative">
                      {showMentionsDropdown && mentionSuggestions.length > 0 && (
                        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2.5 z-50 text-slate-800 dark:text-slate-100 max-h-48 overflow-y-auto">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 border-b border-slate-100 dark:border-slate-800/80 mb-1.5 tracking-wider">
                            Mention Member
                          </div>
                          <div className="space-y-0.5">
                            {mentionSuggestions.map((user, idx) => {
                              const isSelected = idx === selectedMentionIndex;
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => insertMention(user)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {renderAvatar(user.avatarUrl, user.name, 'w-5 h-5 text-[9px]')}
                                  <span className="truncate flex-1">{user.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <textarea
                        rows={1}
                        value={newMessage}
                        onChange={handleNewMessageChange}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${activeRoom.name || 'chat'} (Shift+Enter for newline)...`}
                        className="flex-1 max-h-32 min-h-[24px] outline-none text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 resize-none py-1 scrollbar-thin text-slate-800 dark:text-slate-100"
                        spellCheck={true}
                        autoCorrect="on"
                        autoComplete="on"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 shrink-0 cursor-pointer ${showEmojiPicker ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                          title="Insert emoji"
                        >
                          <Smile size={18} />
                        </button>
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowEmojiPicker(false)} />
                            <div className="absolute right-0 bottom-full mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-3.5 z-50 w-72 max-h-56 overflow-y-auto text-slate-800 dark:text-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex justify-between items-center">
                                <span>Select Emoji</span>
                                <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                              </div>
                              <div className="grid grid-cols-8 gap-1.5">
                                {commonEmojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleSelectEmoji(emoji)}
                                    className="hover:scale-125 transition text-lg p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer flex items-center justify-center"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl transition disabled:opacity-50 shrink-0 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/20 via-slate-50 to-indigo-50/20 dark:from-indigo-950/10 dark:via-[#070b13] dark:to-purple-950/10 p-8 overflow-y-auto scrollbar-thin">
            <div className="max-w-2xl w-full space-y-8 animate-scale-up text-center md:text-left">
              {/* Header Greeting */}
              <div className="bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md rounded-3xl p-8 border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-slate-950/20 flex flex-col md:flex-row items-center gap-6 relative">
                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="absolute top-6 right-6 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-amber-400 transition cursor-pointer shadow-2xs"
                  title="Toggle Theme"
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <div className="flex items-center w-full md:w-auto justify-between md:justify-start">
                  <button
                    type="button"
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition cursor-pointer"
                    title="Toggle Sidebar"
                  >
                    <Menu size={20} />
                  </button>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/20 shrink-0">
                    {currentUser ? getInitials(currentUser.name) : 'NC'}
                  </div>
                  <div className="w-8 md:hidden"></div>
                </div>
                <div className="flex-grow space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    Welcome back, {currentUser ? currentUser.name : 'Collaborator'}!
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Here's a quick overview of your Nexo Chat workspace. Select a discussion on the left or take a quick action below.
                  </p>
                </div>
              </div>

              {/* Statistics Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-md text-left flex items-center gap-4 transition hover:shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Hash size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Group Channels</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-white">{rooms.filter(r => r.isGroup).length}</div>
                  </div>
                </div>

                <div className="bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-md text-left flex items-center gap-4 transition hover:shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Direct Messages</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-white">{rooms.filter(r => !r.isGroup).length}</div>
                  </div>
                </div>

                <div className="bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-md text-left flex items-center gap-4 transition hover:shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Members</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-white">
                      {allUsers.length > 0 ? allUsers.filter(u => u.status === 'online').length : 1}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Quick Actions</h3>
                <div className={`grid grid-cols-1 gap-4 ${
                  (currentUser?.role === 'admin' || currentUser?.role === 'superadmin')
                    ? 'sm:grid-cols-2 lg:grid-cols-4'
                    : 'sm:grid-cols-3'
                }`}>
                  <button
                    onClick={() => {
                      setNewRoomIsGroup(true);
                      setShowCreateRoom(true);
                    }}
                    className="group bg-white dark:bg-[#0b0f19] hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl text-left shadow-sm hover:shadow-lg transition cursor-pointer hover:border-indigo-600 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition mb-3">
                      <Plus size={18} />
                    </div>
                    <h4 className="font-extrabold text-sm mb-1">Create Channel</h4>
                    <p className="text-[11px] opacity-80 leading-normal">Start a new group topic discussion for your team.</p>
                  </button>

                  <button
                    onClick={() => {
                      setNewRoomIsGroup(false);
                      setShowCreateRoom(true);
                    }}
                    className="group bg-white dark:bg-[#0b0f19] hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl text-left shadow-sm hover:shadow-lg transition cursor-pointer hover:border-indigo-600 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition mb-3">
                      <MessageSquare size={16} />
                    </div>
                    <h4 className="font-extrabold text-sm mb-1">Start DM Chat</h4>
                    <p className="text-[11px] opacity-80 leading-normal">Send a private 1-on-1 direct message to a colleague.</p>
                  </button>

                  <button
                    onClick={() => {
                      if (currentUser) {
                        setEditName(currentUser.name);
                        setEditAvatarUrl(currentUser.avatarUrl || 'US');
                        setEditStatus(currentUser.status || 'online');
                        setEditStatusMsg(currentUser.statusMessage || '');
                        setShowEditProfile(true);
                      }
                    }}
                    className="group bg-white dark:bg-[#0b0f19] hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl text-left shadow-sm hover:shadow-lg transition cursor-pointer hover:border-indigo-600 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition mb-3">
                      <Settings size={16} />
                    </div>
                    <h4 className="font-extrabold text-sm mb-1">Update Profile</h4>
                    <p className="text-[11px] opacity-80 leading-normal">Edit your display name, status, or avatar image.</p>
                  </button>

                  {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="group bg-white dark:bg-[#0b0f19] hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl text-left shadow-sm hover:shadow-lg transition cursor-pointer hover:border-indigo-600 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white"
                    >
                      <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition mb-3">
                        <Shield size={16} />
                      </div>
                      <h4 className="font-extrabold text-sm mb-1">Admin Panel</h4>
                      <p className="text-[11px] opacity-80 leading-normal">Manage users, channels, system files, and analytics.</p>
                    </button>
                  )}
                </div>
              </div></div>
          </div>
        )}
      </section>

      {/* Mobile/Tablet Right Sidebar Backdrop Overlay */}
      {showRightPanel && activeRoom && (
        <div
          onClick={() => setShowRightPanel(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
        />
      )}

      {/* 3. Right Sidebar: Details Panel (Live Members, Call History, Pinned Messages, and Shared Files) */}
      <aside className={`
        fixed inset-y-0 right-0 z-45 w-80 flex flex-col shrink-0 overflow-y-auto p-5 space-y-6 scrollbar-thin
        transition-all duration-300 lg:static
        bg-white border-l border-slate-200 text-slate-600 scrollbar-thumb-slate-300
        dark:bg-[#0b0f19] dark:border-slate-800 dark:text-slate-400 dark:scrollbar-thumb-slate-800
        ${(showRightPanel && activeRoom) ? 'translate-x-0 opacity-100' : 'translate-x-full lg:hidden opacity-0 pointer-events-none lg:w-0 lg:p-0 lg:border-l-0'}
      `}>
        {activeRoom ? (
          <>

          {/* Workspace info card */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Workspace Details</h3>
              <button
                type="button"
                onClick={() => setShowRightPanel(false)}
                className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                title="Close Details Panel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/60 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mx-auto mb-2 shadow-sm">
                {activeRoom.isGroup ? <Users size={22} /> : <MessageSquare size={22} />}
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{activeRoom.name || 'direct-chat'}</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {activeRoom.isGroup ? 'Group Discussion Channel' : '1-on-1 Discussion'}
              </p>

              {!activeRoom.isGroup && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-center">
                  <button
                    type="button"
                    onClick={handleClearChatHistoryAction}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition border border-rose-100 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Clear Chat
                  </button>
                </div>
              )}

              {activeRoom.isGroup && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
                  {isCurrentUserAdmin && isEditingGroupName ? (
                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Name</label>
                      <input
                        type="text"
                        value={groupNameInput}
                        onChange={(e) => setGroupNameInput(e.target.value)}
                        placeholder="New group name..."
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameGroup(groupNameInput, groupAvatarInput);
                          if (e.key === 'Escape') setIsEditingGroupName(false);
                        }}
                      />
                      <label className="text-[10px] text-slate-400 font-bold uppercase mt-1">Group Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch(`${API_URL}/upload`, {
                              method: 'POST',
                              body: formData,
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setGroupAvatarInput(data.fileUrl);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-[9px] text-slate-500 file:py-1 file:px-2 file:rounded-lg file:border file:bg-slate-50 dark:file:bg-slate-800 file:text-[9px] file:font-bold cursor-pointer"
                      />
                      <div className="flex gap-2 justify-center mt-1">
                        <button
                          type="button"
                          onClick={() => handleRenameGroup(groupNameInput, groupAvatarInput)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingGroupName(false)}
                          className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {isCurrentUserAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingGroupName(true);
                              setGroupNameInput(activeRoom.name || '');
                              setGroupAvatarInput(activeRoom.avatarUrl || '');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold transition border border-slate-200 dark:border-slate-800 cursor-pointer flex items-center gap-1"
                          >
                            <Edit size={10} /> Edit Group
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteGroup}
                            className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold transition border border-rose-100 dark:border-rose-900/20 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Delete Group
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleClearChatHistoryAction}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold transition border border-slate-200 dark:border-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Clear Chat
                      </button>
                      <button
                        type="button"
                        onClick={handleLeaveGroupAction}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold transition border border-rose-100 dark:border-rose-900/20 cursor-pointer flex items-center gap-1"
                      >
                        <LogOut size={10} /> Leave Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <Users size={16} className="text-slate-500" /> Members
              {(() => {
                const participantIds = activeRoom.participants?.map((p: any) => Number(p.user?.id)) || [];
                const onlineCount = allUsers.filter(
                  (u) => participantIds.includes(Number(u.id)) && u.status === 'online'
                ).length;
                const total = activeRoom.participants?.length || 1;
                return (
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full ml-auto">
                    {onlineCount} / {total} online
                  </span>
                );
              })()}
            </h3>
            <div className="space-y-3">
              {(activeRoom.participants
                ? [...activeRoom.participants].sort((a: any, b: any) => {
                    const statusOrder: Record<string, number> = { online: 0, away: 1, offline: 2 };
                    const aLive = allUsers.find((u) => Number(u.id) === Number(a.user?.id));
                    const bLive = allUsers.find((u) => Number(u.id) === Number(b.user?.id));
                    const aStatus = aLive?.status || a.user?.status || 'offline';
                    const bStatus = bLive?.status || b.user?.status || 'offline';
                    return (statusOrder[aStatus] ?? 2) - (statusOrder[bStatus] ?? 2);
                  })
                : []
              ).map((p: any) => {
                const user = p.user;
                // Always resolve live status from allUsers (socket-updated); fallback to stored value
                const liveUser = allUsers.find((u) => Number(u.id) === Number(user?.id));
                const status: string = liveUser?.status || user?.status || 'offline';
                const statusMessage: string = liveUser?.statusMessage || user?.statusMessage || '';

                const statusLabel =
                  status === 'online' ? 'Online' :
                  status === 'away' ? 'Away' : 'Offline';

                const dotColor =
                  status === 'online' ? 'bg-emerald-500' :
                  status === 'away' ? 'bg-amber-400' : 'bg-slate-400';

                return (
                  <div key={p.id} className="flex items-center gap-3 group/member p-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative shrink-0">
                        {renderAvatar(liveUser?.avatarUrl ?? user?.avatarUrl, liveUser?.name ?? user?.name, 'w-8 h-8 text-xs')}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0b0f19] ${dotColor}`} title={statusLabel}></span>
                      </div>
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1">
                        {liveUser?.name ?? user?.name}
                        {p.isAdmin && (
                          <span className="bg-indigo-100 text-indigo-700 text-[8px] font-extrabold px-1 rounded scale-90" title="Group Admin">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] truncate italic font-medium ${
                        status === 'online' ? 'text-emerald-500' :
                        status === 'away' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {statusMessage || statusLabel}
                      </div>
                    </div>
                    {isCurrentUserAdmin && user.id !== currentUser.id && (
                      <div className="opacity-0 group-hover/member:opacity-100 flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleToggleAdminStatus(user.id)}
                          className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 px-1 py-0.5 rounded hover:bg-slate-200/50 cursor-pointer"
                          title={p.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        >
                          Role
                        </button>
                        <button
                          onClick={() => handleRemoveGroupMember(user.id)}
                          className="text-[9px] font-bold text-slate-400 hover:text-rose-500 px-1 py-0.5 rounded hover:bg-slate-200/50 cursor-pointer"
                          title="Remove Member"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!activeRoom.participants || activeRoom.participants.length === 0) && (
                <p className="text-xs text-slate-400">Only you are in this room.</p>
              )}
            </div>

            {/* Admin Add Member Trigger Button */}
            {isCurrentUserAdmin && (
              <button
                onClick={() => setShowAddMember(true)}
                className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <Plus size={13} /> Add Member
              </button>
            )}
          </div>

          {/* Call History section */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <Video size={15} className="text-slate-500" /> Call History
            </h3>
            <div className="space-y-2.5">
              {callHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No call logs for this room.</p>
              ) : (
                <>
                  {(showAllCallHistory ? callHistory : callHistory.slice(0, 5)).map((call) => {
                    const participants: Array<{ id: number; name: string; joinedAt: string }> =
                      Array.isArray(call.participants) ? call.participants : [];
                    const statusColor =
                      call.status === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                        : call.status === 'active'
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                        : call.status === 'missed'
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
                    return (
                      <div
                        key={call.id}
                        className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/50 rounded-xl p-3 shadow-sm space-y-2.5 text-xs"
                      >
                        {/* Header: caller + status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 rounded-full flex items-center justify-center text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {call.callerName?.substring(0, 2).toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                {call.callerName}
                              </div>
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Started the call</div>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {call.status}
                          </span>
                        </div>

                        {/* Participants who joined */}
                        {participants.length > 0 && (
                          <div>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                              Joined ({participants.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {participants.map((p, idx) => (
                                <span
                                  key={idx}
                                  title={p.joinedAt ? `Joined: ${new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg px-1.5 py-0.5 text-[9px] font-semibold"
                                >
                                  <span>{p.name}</span>
                                  {p.joinedAt && (
                                    <span className="text-slate-400 dark:text-slate-500">
                                      {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timeline & Duration */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60">
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 dark:text-slate-400">Started:</span>
                              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                                {new Date(call.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            {call.endedAt && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 dark:text-slate-400">Ended:</span>
                                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                                  {new Date(call.endedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                            )}
                          </div>
                          {call.duration > 0 && (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <span>{Math.floor(call.duration / 60) > 0 ? `${Math.floor(call.duration / 60)}m ` : ''}{call.duration % 60}s</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {callHistory.length > 5 && (
                    <button
                      onClick={() => setShowAllCallHistory(!showAllCallHistory)}
                      className="w-full text-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 py-1.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer mt-1"
                    >
                      {showAllCallHistory ? 'Show Less ▲' : `Show More (${callHistory.length - 5} more) ▼`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* LIVE Pinned Messages */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <Pin size={15} className="text-slate-500" /> Pinned Messages
            </h3>
            <div className="space-y-2">
              {pinnedMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No pinned messages yet. Hover messages and click the pin icon.</p>
              ) : (
                <>
                  {pinnedMessages.slice(0, 3).map((pin) => (
                    <div key={pin.id} onClick={() => handleScrollToMessage(pin.id)} className="bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 space-y-1 relative group shadow-sm cursor-pointer transition">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-655 font-extrabold truncate">{pin.user?.name}</span>
                          <span className="font-normal text-slate-300">•</span>
                          <span className="shrink-0">{new Date(pin.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(pin.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 font-bold transition text-[9px] cursor-pointer"
                        >
                          Unpin
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {pin.content}
                      </p>
                    </div>
                  ))}
                  {pinnedMessages.length > 3 && (
                    <button
                      onClick={() => setShowAllPinnedMessages(true)}
                      className="w-full text-center text-[10px] font-bold text-indigo-600 hover:text-indigo-500 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer mt-1"
                    >
                      Show More ({pinnedMessages.length - 3} more)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* LIVE Shared Files */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <FileText size={15} className="text-slate-500" /> Shared Files
            </h3>
            <div className="space-y-2.5">
              {sharedFiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No shared documents or images in this room.</p>
              ) : (
                <>
                  {sharedFiles.slice(0, 10).map((file) => {
                    const isImg = file.fileType.startsWith('image/');
                    return (
                      <div key={file.id} className="flex gap-2.5 items-start p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/60 transition group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                          {isImg ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                          <div
                            onClick={() => window.open(`${API_URL}${file.fileUrl}`, '_blank')}
                            className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                            title={file.fileName}
                          >
                            {file.fileName}
                          </div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{formatBytes(file.fileSize)}</span>
                            <span className="w-0.7 h-0.7 rounded-full bg-slate-300"></span>
                            <span className="truncate">{file.message?.user?.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {sharedFiles.length > 10 && (
                    <button
                      onClick={() => setShowAllSharedFiles(true)}
                      className="w-full text-center text-[10px] font-bold text-indigo-600 hover:text-indigo-500 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer mt-1"
                    >
                      Show More ({sharedFiles.length - 10} more)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Info size={22} />
            </div>
            <h4 className="font-extrabold text-slate-800 dark:text-white text-sm mb-1">No Active Chat</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal max-w-[200px] mx-auto">
              Select a channel or direct message to view workspace members, pinned items, and files.
            </p>
          </div>
        )}
        </aside>

      {/* 4. Fullscreen / Modal Call screen */}
      {inCall && (callRoomId || activeRoom?.id) && currentUser && (
        <VideoCall
          socket={socket}
          roomId={callRoomId || activeRoom?.id || 0}
          currentUser={currentUser}
          onClose={() => {
            setInCall(false);
            setCallRoomId(null);
            setIncomingCall(null);
          }}
          isIncoming={incomingCall !== null}
          incomingOfferSignal={incomingCall}
          callType={callType}
          autoAccept={incomingCall !== null}
          isRejoining={incomingCall === null && activeCalls[callRoomId || activeRoom?.id || 0] !== undefined}
          allUsers={allUsers}
          onInviteUser={activeRoom?.isGroup ? handleInviteUserToCall : undefined}
        />
      )}

      {/* 5. EDIT PROFILE MODAL */}
      {showEditProfile && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User size={20} className="text-indigo-600" /> Edit Profile Settings
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Profile Status message
                </label>
                <input
                  type="text"
                  placeholder="e.g. In a meeting, out for lunch"
                  value={editStatusMsg}
                  onChange={(e) => setEditStatusMsg(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Presence Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition text-slate-800"
                >
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="dnd">Do Not Disturb (DND)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Avatar Initials
                </label>
                <div className="flex gap-1.5 mt-1">
                  {avatarOptions.map((opt) => {
                    const dynamicInitials = getInitials(editName || currentUser?.name || 'US');
                    const isSelected = editAvatarUrl === opt;
                    const bgClass = getAvatarColor(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditAvatarUrl(opt)}
                        className={`w-9 h-9 rounded-full font-extrabold text-xs border flex items-center justify-center transition cursor-pointer ${bgClass} ${isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500 dark:ring-indigo-400 scale-110 shadow-md'
                          : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                        title={`Select ${opt} color theme`}
                      >
                        {dynamicInitials}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Or Upload Custom Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch(`${API_URL}/upload`, {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setEditAvatarUrl(data.fileUrl);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Change Password (optional)
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Leave blank to keep current"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Data & Account Management Section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Data & Account Management
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl font-bold text-xs transition cursor-pointer border border-indigo-100/50 dark:border-indigo-900/30"
                  >
                    <Download size={14} /> Backup Chats
                  </button>
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl font-bold text-xs transition cursor-pointer border border-indigo-100/50 dark:border-indigo-900/30">
                    <Upload size={14} /> Import Chats
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl font-bold text-xs transition cursor-pointer border border-rose-100 dark:border-rose-900/20"
                  >
                    <Trash2 size={14} /> Delete Account Permanently
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditPassword('');
                  }}
                  className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREATE ROOM / SEARCH USERS MODAL */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-5 animate-scale-up">
            <h3 className="text-lg font-extrabold text-slate-900">
              {newRoomIsGroup ? 'Create new group channel' : 'Start private discussion'}
            </h3>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {newRoomIsGroup && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. design-review"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800 bg-white"
                  />
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 mt-3">
                    Group Avatar (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch(`${API_URL}/upload`, {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setNewRoomAvatarUrl(data.fileUrl);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Workspace Members
                </label>

                {/* Search members bar */}
                <div className="relative mb-3.5">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={workspaceSearchQuery}
                    onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                  />
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50 scrollbar-thin">
                  {filteredWorkspaceUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleUserSelection(user.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition cursor-pointer ${isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                          : 'bg-white border-slate-200/60 hover:bg-slate-50'
                          }`}
                      >
                        {renderAvatar(user.avatarUrl, user.name, 'w-7 h-7 text-[10px]')}
                        <div className="overflow-hidden flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate">{user.name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{user.email}</div>
                        </div>
                        {isSelected && <CheckCheck size={14} className="text-indigo-600 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredWorkspaceUsers.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      {workspaceSearchQuery.trim() === ''
                        ? 'Type a name or email to search for a member.'
                        : 'No workspace members found.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                    setNewRoomAvatarUrl('');
                    setSelectedUserIds([]);
                    setWorkspaceSearchQuery('');
                  }}
                  className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newRoomIsGroup ? !newRoomName.trim() : selectedUserIds.length === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. ADMIN ADD MEMBER MODAL */}
      {showAddMember && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" /> Add Member to Group
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Workspace Member
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {allUsers
                    .filter((u) => u.id !== currentUser?.id && !activeRoom.participants?.some((p: any) => p.user.id === u.id))
                    .map((user) => {
                      const isSelected = selectedAddMemberId === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedAddMemberId(user.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition cursor-pointer ${isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-white border-slate-200/60 hover:bg-slate-50'
                            }`}
                        >
                          {renderAvatar(user.avatarUrl, user.name, 'w-7 h-7 text-[10px]')}
                          <div className="overflow-hidden flex-1">
                            <span className="text-xs font-bold text-slate-800 block truncate">{user.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{user.email}</span>
                          </div>
                          {isSelected && <CheckCheck size={14} className="text-indigo-600 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  {allUsers.filter((u) => u.id !== currentUser?.id && !activeRoom.participants?.some((p: any) => p.user.id === u.id)).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">All workspace users are already members of this group.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedAddMemberId(null);
                  }}
                  className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGroupMember}
                  disabled={!selectedAddMemberId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Incoming Call Modal (with shaking and ringtone) */}
      {incomingCall && !inCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-sm border border-slate-800 text-center shadow-2xl animate-shake">
            <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-2xl animate-bounce shadow-lg shadow-indigo-600/30">
              {incomingCall.senderName.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold mb-1">{incomingCall.senderName}</h3>
            <p className="text-slate-400 text-xs mb-6">
              Inviting you to join a {incomingCall.callType || 'video'} review call
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  const targetRoomId = incomingCall.roomId;
                  if (targetRoomId) {
                    const matched = rooms.find((r: any) => r.id === targetRoomId);
                    if (matched) {
                      setActiveRoom(matched);
                    } else {
                      const token = localStorage.getItem('nexo_token');
                      if (token) {
                        try {
                          const res = await fetch(`${API_URL}/rooms/${targetRoomId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (res.ok) {
                            const newRm = await res.json();
                            setRooms((prev) => [...prev, newRm]);
                            setActiveRoom(newRm);
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }
                  }
                  setInCall(true);
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/20"
              >
                {incomingCall.callType === 'voice' ? <Phone size={16} /> : <Video size={16} />} Accept Call
              </button>
              <button
                onClick={() => {
                  if (socket) {
                    socket.emit('videoCallSignal', {
                      roomId: incomingCall.roomId || activeRoom.id,
                      senderId: currentUser.id,
                      senderName: currentUser.name,
                      signal: null,
                      type: 'hangup',
                    });
                  }
                  setIncomingCall(null);
                }}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-700/20"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FULL CALL HISTORY MODAL */}
      {showAllCallHistory && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Video size={20} className="text-indigo-600" /> Full Call History
              </h3>
              <button
                onClick={() => setShowAllCallHistory(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {callHistory.map((call) => (
                <div key={call.id} className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex items-center justify-between text-xs shadow-sm">
                  <div className="overflow-hidden mr-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{call.callerName}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(call.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${call.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                      {call.status}
                    </span>
                    {call.status === 'completed' && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{call.duration}s</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAllCallHistory(false)}
                className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SHARED FILES MODAL */}
      {showAllSharedFiles && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> Full Shared Files
              </h3>
              <button
                onClick={() => setShowAllSharedFiles(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {sharedFiles.map((file) => {
                const isImg = file.fileType.startsWith('image/');
                return (
                  <div key={file.id} className="flex gap-3 items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition group">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                      {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div
                        onClick={() => window.open(`${API_URL}${file.fileUrl}`, '_blank')}
                        className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{formatBytes(file.fileSize)}</span>
                        <span className="w-0.7 h-0.7 rounded-full bg-slate-300"></span>
                        <span className="truncate">Uploaded by {file.message?.user?.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(`${API_URL}${file.fileUrl}`, '_blank')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer border border-slate-200"
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAllSharedFiles(false)}
                className="px-5 py-2.5 bg-slate-500 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show All Pinned Messages Modal */}
      {showAllPinnedMessages && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Pin size={20} className="text-indigo-600" /> All Pinned Messages
              </h3>
              <button
                onClick={() => setShowAllPinnedMessages(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {pinnedMessages.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => { handleScrollToMessage(pin.id); setShowAllPinnedMessages(false); }}
                  className="bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-3 space-y-1 relative group shadow-sm cursor-pointer transition"
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-extrabold truncate text-slate-600 dark:text-slate-300">{pin.user?.name}</span>
                      <span className="font-normal text-slate-300">•</span>
                      <span className="shrink-0">{new Date(pin.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(pin.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 font-bold transition text-[9px] cursor-pointer px-1.5 py-0.5 bg-rose-50 rounded"
                    >
                      Unpin
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                    {pin.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAllPinnedMessages(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
  '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
  '🤗', '🤔', '🫣', '🤭', '🫢', '🤫', '🫠', '🤥', '😶',
  '😐', '😑', '😬', '🫨', '😮', '🥱', '😴', '🤤', '😪',
  '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🫶',
  '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
  '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🖤', '🩶',
  '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗',
  '💖', '💘', '💝', '💟', '🌟', '⭐', '✨', '⚡', '💥', '🔥'
];
