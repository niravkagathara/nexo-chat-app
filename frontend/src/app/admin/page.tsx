'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  MessageSquare,
  Video,
  Paperclip,
  TrendingUp,
  Search,
  Settings,
  Trash2,
  Edit,
  Key,
  Database,
  ArrowLeft,
  Activity,
  Check,
  AlertCircle,
  FileText,
  Clock,
  LogOut,
  HelpCircle,
  Filter,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nexochat.in';

type Tab = 'overview' | 'users' | 'rooms' | 'files' | 'calls' | 'permissions';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Theme & Responsiveness States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showAdminMobileSidebar, setShowAdminMobileSidebar] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexo_theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    // Light mode only
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

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);

  const canPerform = (action: string) => {
    return currentUser?.role === 'superadmin' || !!currentUser?.permissions?.[action];
  };

  // Search/Filters
  const [userQuery, setUserQuery] = useState('');
  const [roomQuery, setRoomQuery] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [callQuery, setCallQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Modal States
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);

  // Forms
  const [editRole, setEditRole] = useState('user');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New forms/states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('user');

  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState<string>('');
  const [memberActionLoading, setMemberActionLoading] = useState<number | null>(null);

  // Session check on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('nexo_token');
    const savedUserStr = localStorage.getItem('nexo_user');

    if (!savedToken || !savedUserStr) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(savedUserStr);
    setCurrentUser(parsedUser);
    setToken(savedToken);

    // Verify token and role with backend /auth/me
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((freshUser) => {
        if (freshUser.role === 'admin' || freshUser.role === 'superadmin') {
          setIsAuthorized(true);
          // Sync fresh info
          setCurrentUser(freshUser);
          localStorage.setItem('nexo_user', JSON.stringify(freshUser));
        } else {
          setIsAuthorized(false);
        }
        setIsVerifying(false);
      })
      .catch(() => {
        setIsAuthorized(false);
        setIsVerifying(false);
        router.push('/login');
      });
  }, [router]);

  // Load active tab data
  useEffect(() => {
    if (isVerifying || !isAuthorized || !token) return;
    
    setLoading(true);
    setError('');
    
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === 'overview') {
      fetch(`${API_URL}/admin/stats`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load stats'); return res.json(); })
        .then(data => { setStats(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else if (activeTab === 'users') {
      fetch(`${API_URL}/admin/users`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load users'); return res.json(); })
        .then(data => { setUsers(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else if (activeTab === 'rooms') {
      fetch(`${API_URL}/admin/rooms`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load rooms'); return res.json(); })
        .then(data => { setRooms(data); })
        .catch(err => { setError(err.message); });

      fetch(`${API_URL}/admin/users`, { headers })
        .then(res => { if (res.ok) return res.json(); })
        .then(data => { if (data) setUsers(data); setLoading(false); })
        .catch(() => { setLoading(false); });
    } else if (activeTab === 'files') {
      fetch(`${API_URL}/admin/files`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load files'); return res.json(); })
        .then(data => { setFiles(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else if (activeTab === 'calls') {
      fetch(`${API_URL}/admin/calls`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load call logs'); return res.json(); })
        .then(data => { setCalls(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else if (activeTab === 'permissions') {
      fetch(`${API_URL}/admin/permissions`, { headers })
        .then(res => { if (!res.ok) throw new Error('Failed to load permissions'); return res.json(); })
        .then(data => { setRolePermissions(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    }
  }, [activeTab, isVerifying, isAuthorized, token]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(''), 4000);
    }
  };

  // ─── Admin Actions ────────────────────────────────────────────────────────────

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: addName, email: addEmail, password: addPassword, role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');

      showFeedback('success', `Successfully created user ${data.name}`);
      setUsers(prev => [data, ...prev]);
      setShowAddUserModal(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddRole('user');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleChannelAdmin = async (roomId: number, userId: number) => {
    if (!token) return;
    setMemberActionLoading(userId);
    try {
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}/members/${userId}/toggle-admin`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle admin');

      showFeedback('success', data.message);
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return {
            ...r,
            members: r.members.map((m: any) => m.id === userId ? { ...m, isAdmin: data.isAdmin } : m)
          };
        }
        return r;
      }));
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleRemoveChannelMember = async (roomId: number, userId: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to remove this member from the channel?')) return;
    setMemberActionLoading(userId);
    try {
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove member');
      }

      showFeedback('success', 'Member removed successfully');
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return {
            ...r,
            members: r.members.filter((m: any) => m.id !== userId)
          };
        }
        return r;
      }));
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleAddChannelMember = async (roomId: number) => {
    if (!token || !addMemberUserId) return;
    const userId = parseInt(addMemberUserId);
    try {
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add member');

      showFeedback('success', 'Member added successfully');
      const addedUser = users.find(u => u.id === userId);
      const newMember = {
        id: userId,
        name: addedUser ? addedUser.name : 'New User',
        email: addedUser ? addedUser.email : '',
        isAdmin: false,
        joinedAt: new Date().toISOString()
      };

      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return {
            ...r,
            members: [...r.members, newMember]
          };
        }
        return r;
      }));
      setAddMemberUserId('');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');

      showFeedback('success', `Successfully updated profile for ${data.name}`);
      // Refresh local list
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...data } : u));
      setShowEditUserModal(false);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token) return;
    if (newPassword.length < 6) {
      showFeedback('error', 'Password must be at least 6 characters');
      return;
    }
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      showFeedback('success', `Password successfully reset for ${selectedUser.name}`);
      setNewPassword('');
      setShowResetPasswordModal(false);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !token) return;
    if (selectedUser.id === currentUser?.id) {
      showFeedback('error', 'Cannot delete your own superadmin account!');
      setShowDeleteUserModal(false);
      return;
    }
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      showFeedback('success', `Successfully deleted user ${selectedUser.name}`);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setShowDeleteUserModal(false);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete room');
      }

      showFeedback('success', `Successfully deleted room "${selectedRoom.name || 'Group Channel'}"`);
      setRooms(prev => prev.filter(r => r.id !== selectedRoom.id));
      setShowDeleteRoomModal(false);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/files/${selectedFile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete file');
      }

      showFeedback('success', `Successfully deleted file "${selectedFile.fileName}"`);
      setFiles(prev => prev.filter(f => f.id !== selectedFile.id));
      setShowDeleteFileModal(false);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePermissions = async (role: string, updatedPerms: { [action: string]: boolean }) => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, permissions: updatedPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update permissions');

      showFeedback('success', `Permissions for ${role} updated successfully`);
      // Update local state
      setRolePermissions(prev => prev.map(p => {
        if (p.role === role && p.action in updatedPerms) {
          return { ...p, allowed: updatedPerms[p.action] };
        }
        return p;
      }));
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formats
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered lists
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(userQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userQuery.toLowerCase());
    const matchesRole =
      userRoleFilter === 'all' ? true : user.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredRooms = rooms.filter(room => {
    if (!room.isGroup) return false;
    const name = room.name || 'Group Channel';
    return name.toLowerCase().includes(roomQuery.toLowerCase());
  });

  const filteredFiles = files.filter(file => {
    return (
      file.fileName.toLowerCase().includes(fileQuery.toLowerCase()) ||
      file.uploader?.name.toLowerCase().includes(fileQuery.toLowerCase()) ||
      file.uploader?.email.toLowerCase().includes(fileQuery.toLowerCase())
    );
  });

  const filteredCalls = calls.filter(call => {
    const callerName = call.callerName || '';
    const roomName = call.room?.name || '';
    return (
      callerName.toLowerCase().includes(callQuery.toLowerCase()) ||
      roomName.toLowerCase().includes(callQuery.toLowerCase())
    );
  });

  // Guard view
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#080b13] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#080b13] flex flex-col items-center justify-center text-white font-sans p-6 text-center">
        <Shield size={64} className="text-rose-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-extrabold text-white mb-2">403 — Access Denied</h1>
        <p className="text-slate-400 max-w-md mb-8">
          You do not have the required administrative role to view the dashboard panel.
        </p>
        <button
          onClick={() => router.push('/chat')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Chat Workspace
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-[#080b13] text-slate-800 dark:text-slate-100 font-sans flex transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* ── Sidebar Navigation ─────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-45 w-64 flex flex-col justify-between shrink-0 p-6 transition-transform duration-300 md:static md:translate-x-0
        bg-white dark:bg-[#0a0f1d] border-r border-slate-200 dark:border-slate-200 dark:border-slate-800/80
        ${showAdminMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="space-y-8">
          {/* Brand */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo-icon.png" alt="NexoChat Logo" className="w-9 h-9 object-contain rounded-xl" />
              <div>
                <span className="text-base font-black tracking-tight block text-slate-850 dark:text-white">Nexo Admin</span>
                <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wider block">Super Admin Dashboard</span>
              </div>
            </div>
            <button
              onClick={() => setShowAdminMobileSidebar(false)}
              className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              title="Close Menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav List */}
          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', Icon: Database },
              { id: 'users', label: 'Users Directory', Icon: Users },
              { id: 'rooms', label: 'Rooms & Channels', Icon: MessageSquare },
              { id: 'files', label: 'Shared Files', Icon: Paperclip },
              { id: 'calls', label: 'WebRTC Call Logs', Icon: Video },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id as Tab);
                  setShowAdminMobileSidebar(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}

            {currentUser?.role === 'superadmin' && (
              <button
                onClick={() => {
                  setActiveTab('permissions');
                  setShowAdminMobileSidebar(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'permissions'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield size={18} />
                <span>Role Permissions</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Info / Actions */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md">
              {getInitials(currentUser?.name || '')}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold block text-slate-850 dark:text-white truncate">{currentUser?.name}</span>
              <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold block uppercase tracking-wider">
                {currentUser?.role}
              </span>
            </div>
          </div>

          {/* Theme toggler removed for light-only mode */}

          <button
            onClick={() => {
              setShowAdminMobileSidebar(false);
              router.push('/chat');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-70/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Chat Workspace</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {showAdminMobileSidebar && (
        <div
          onClick={() => setShowAdminMobileSidebar(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in"
        />
      )}

      {/* ── Main Content Area ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8 bg-slate-50 dark:bg-[#080b13] transition-colors duration-300">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdminMobileSidebar(true)}
              className="md:hidden p-2 bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeTab === 'overview' && 'System Analytics'}
                {activeTab === 'users' && 'Manage Users'}
                {activeTab === 'rooms' && 'Manage Discussion Channels'}
                {activeTab === 'files' && 'Shared Attachments Audit'}
                {activeTab === 'calls' && 'WebRTC Call History'}
                {activeTab === 'permissions' && 'Role Permission Management'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                {activeTab === 'overview' && 'Real-time metrics, message trends, and database records overview.'}
                {activeTab === 'users' && 'Promote user roles, force password resets, or remove workspace members.'}
                {activeTab === 'rooms' && 'Monitor and manage group discussion channels, members, and channel admins.'}
                {activeTab === 'files' && 'Audit shared document history and perform storage disk space cleanups.'}
                {activeTab === 'calls' && 'Review WebRTC voice and video session histories and durations.'}
                {activeTab === 'permissions' && 'Configure dynamic action-level privileges for standard administrators.'}
              </p>
            </div>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center gap-3">
            {success && (
              <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs px-4 py-2.5 rounded-xl font-medium shadow-sm animate-fade-in">
                <Check size={14} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-900/40 text-rose-400 text-xs px-4 py-2.5 rounded-xl font-medium shadow-sm animate-fade-in">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="h-4 border-l border-slate-300 dark:border-slate-200 dark:border-slate-800/80" />
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-2xs">
              <Activity size={12} className="text-emerald-400 animate-pulse" />
              <span>Server Online</span>
            </div>
          </div>
        </header>

        {/* Tab View Loader */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Fetching records...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            
            {/* ── TAB: OVERVIEW ───────────────────────────────────────────────── */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                  {[
                    { label: 'Active Users', value: stats.totalUsers, Icon: Users, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                    { label: 'Chat Rooms', value: stats.totalRooms, Icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                    { label: 'Total Messages', value: stats.totalMessages, Icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                    { label: 'Files Shared', value: stats.totalFiles, Icon: Paperclip, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                    { label: 'Total Calls', value: stats.totalCalls, Icon: Video, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#0a0f1d]/50 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold block">{card.label}</span>
                        <span className="text-3xl font-black text-slate-905 dark:text-white mt-1.5 block">{card.value}</span>
                      </div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}>
                        <card.Icon size={20} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Message Trend Chart */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                    <div className="mb-6 flex justify-between items-center">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" />
                        Message Volume (Last 7 Days)
                      </h3>
                      <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Active Logs
                      </span>
                    </div>

                    {/* CSS Bar Chart */}
                    <div className="h-64 flex items-end justify-between gap-4 pt-4 px-2">
                      {stats.messageTrend.map((day: any, idx: number) => {
                        const maxVal = Math.max(...stats.messageTrend.map((d: any) => d.count), 1);
                        const percent = (day.count / maxVal) * 80 + 10; // Bounds 10% to 90%
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                            <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-300">
                              {day.count}
                            </span>
                            <div 
                              style={{ height: `${percent}%` }}
                              className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-lg shadow-sm hover:from-blue-500 hover:to-indigo-400 hover:scale-105 active:scale-95 transition-all duration-300 relative cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1 text-center truncate w-full">
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right side stats Card */}
                  <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2 mb-6">
                        <Database size={16} className="text-amber-400" />
                        Storage & Infrastructure
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Disk Storage Used</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{formatBytes(stats.storageSize)}</span>
                          </div>
                          <Paperclip className="text-amber-400" size={24} />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Avg Messages / Room</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                              {stats.totalRooms > 0 ? (stats.totalMessages / stats.totalRooms).toFixed(1) : 0}
                            </span>
                          </div>
                          <MessageSquare className="text-indigo-400" size={24} />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <button
                          onClick={async () => {
                            if (!token) return;
                            setActionLoading(true);
                            setError('');
                            setSuccess('');
                            try {
                              const res = await fetch(`${API_URL}/admin/backup/trigger`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message || 'Backup failed');
                              showFeedback('success', 'Backup successfully uploaded to Google Drive!');
                            } catch (err: any) {
                              showFeedback('error', err.message);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading || !canPerform('trigger_backup')}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                            canPerform('trigger_backup')
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent cursor-pointer shadow-md'
                              : 'bg-slate-800/40 text-slate-500 border-slate-850 cursor-not-allowed'
                          }`}
                          title={!canPerform('trigger_backup') ? 'Requires backup privileges' : 'Backup to Google Drive'}
                        >
                          <Database size={14} />
                          <span>{actionLoading ? 'Uploading Backup...' : 'Trigger Google Drive Backup'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800/50 text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock size={12} />
                      <span>Data snapshot refreshed just now.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: USERS ──────────────────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div className="space-y-5 animate-fade-in">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userQuery}
                      onChange={e => setUserQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      <select
                        value={userRoleFilter}
                        onChange={e => setUserRoleFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="all">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setShowAddUserModal(true)}
                      disabled={!canPerform('manage_users')}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border ${
                        canPerform('manage_users')
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent cursor-pointer shadow-md'
                          : 'bg-slate-800/40 text-slate-500 border-slate-850 cursor-not-allowed'
                      }`}
                      title={!canPerform('manage_users') ? 'Requires User Directory Management permission' : 'Create a new user'}
                    >
                      <Users size={14} />
                      <span>Create User</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
                          <th className="py-4 px-6">User Profile</th>
                          <th className="py-4 px-6">Email Address</th>
                          <th className="py-4 px-6">Security Role</th>
                          <th className="py-4 px-6">Messages Sent</th>
                          <th className="py-4 px-6">Joined Date</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8.5 h-8.5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm shrink-0">
                                    {user.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-850 block">{user.name}</span>
                                    <span className="text-[10px] text-slate-500 font-medium block">ID: {user.id}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-slate-700 font-mono text-xs">{user.email}</td>
                              <td className="py-4 px-6">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  user.role === 'superadmin'
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : user.role === 'admin'
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : 'bg-slate-105 text-slate-600 border-slate-200'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-700 font-mono text-xs">{user.messageCount}</td>
                              <td className="py-4 px-6 text-slate-600 text-xs">{formatDate(user.createdAt)}</td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      if (!canPerform('manage_users')) return;
                                      setSelectedUser(user);
                                      setEditName(user.name);
                                      setEditEmail(user.email);
                                      setEditRole(user.role);
                                      setShowEditUserModal(true);
                                    }}
                                    disabled={!canPerform('manage_users')}
                                    className={`p-2 border border-transparent rounded-lg transition ${
                                      canPerform('manage_users')
                                        ? 'hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-400 cursor-pointer'
                                        : 'opacity-30 cursor-not-allowed text-slate-600'
                                    }`}
                                    title={!canPerform('manage_users') ? 'Requires User Directory Management permission' : 'Edit Profile'}
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!canPerform('manage_users')) return;
                                      setSelectedUser(user);
                                      setShowResetPasswordModal(true);
                                    }}
                                    disabled={!canPerform('manage_users')}
                                    className={`p-2 border border-transparent rounded-lg transition ${
                                      canPerform('manage_users')
                                        ? 'hover:bg-amber-500/10 hover:text-amber-400 text-slate-400 cursor-pointer'
                                        : 'opacity-30 cursor-not-allowed text-slate-600'
                                    }`}
                                    title={!canPerform('manage_users') ? 'Requires User Directory Management permission' : 'Reset Password'}
                                  >
                                    <Key size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!canPerform('manage_users')) return;
                                      setSelectedUser(user);
                                      setShowDeleteUserModal(true);
                                    }}
                                    disabled={user.id === currentUser?.id || !canPerform('manage_users')}
                                    className={`p-2 rounded-lg border border-transparent transition ${
                                      user.id === currentUser?.id || !canPerform('manage_users')
                                        ? 'opacity-30 cursor-not-allowed text-slate-600'
                                        : 'hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 cursor-pointer'
                                    }`}
                                    title={
                                      user.id === currentUser?.id
                                        ? 'Cannot delete your own admin account'
                                        : !canPerform('manage_users')
                                        ? 'Requires User Directory Management permission'
                                        : 'Delete User'
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 font-semibold">
                              No users match the search criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: ROOMS ──────────────────────────────────────────────────── */}
            {activeTab === 'rooms' && (
              <div className="space-y-5 animate-fade-in">
                {/* Filter */}
                <div className="flex items-center bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search channels/rooms by name..."
                      value={roomQuery}
                      onChange={e => setRoomQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Channel Cards */}
                {filteredRooms.length > 0 ? (
                  <div className="space-y-3">
                    {filteredRooms.map(room => (
                      <div key={room.id} className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover:border-slate-700/60 transition-colors duration-200">

                        {/* ── Channel Header Row ─────────────────────── */}
                        <div
                          className="flex flex-wrap items-center gap-4 p-5 cursor-pointer"
                          onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
                        >
                          {/* Icon + Name */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 border ${
                              room.isGroup
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {room.isGroup ? '#' : '@'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-white text-sm truncate">
                                  {room.isGroup ? `Group Name: ${room.name || 'Unnamed'}` : (room.name || 'Direct Message')}
                                </span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  room.isGroup
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                  {room.isGroup ? 'Group Channel' : 'DM'}
                                </span>
                              </div>
                              {room.isGroup && (
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                  Channel Name: {room.name || 'Unnamed'}
                                </span>
                              )}
                            </div>
                          </div>
                                {/* Active Members Preview */}
                          <div className="flex flex-col gap-1.5 min-w-[200px] max-w-[340px]">
                            <div className="flex items-center gap-2">
                              <Users size={11} className="text-indigo-400 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Active Members ({room.members.length})
                              </span>
                            </div>
                            {room.members.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {room.members.slice(0, 4).map((member: any) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/60 rounded-lg px-2 py-1 max-w-[160px]"
                                    title={`${member.name} — ${member.email}`}
                                  >
                                    <div className="w-4 h-4 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-[8px] font-bold text-indigo-400 shrink-0">
                                      {member.name.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[10px] font-semibold text-slate-300 truncate block">{member.name}</span>
                                      <span className="text-[9px] text-slate-500 font-mono truncate block">{member.email}</span>
                                    </div>
                                    {member.isAdmin && (
                                      <span className="text-[8px] font-black text-blue-400 shrink-0">★</span>
                                    )}
                                  </div>
                                ))}
                                {room.members.length > 4 && (
                                  <div className="flex items-center px-2 py-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/40 rounded-lg">
                                    <span className="text-[10px] text-slate-500 font-semibold">+{room.members.length - 4} more</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">No members yet</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedRoomId(expandedRoomId === room.id ? null : room.id); }}
                              className="px-3 py-1.5 text-[10px] font-bold rounded-xl border border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-400 transition cursor-pointer"
                            >
                              {expandedRoomId === room.id ? 'Hide Members ▲' : 'Manage Members ▼'}
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (!canPerform('manage_rooms')) return;
                                setSelectedRoom(room);
                                setShowDeleteRoomModal(true);
                              }}
                              disabled={!canPerform('manage_rooms')}
                              className={`p-2 border rounded-xl transition ${
                                canPerform('manage_rooms')
                                  ? 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 cursor-pointer'
                                  : 'opacity-30 cursor-not-allowed border-transparent text-slate-655'
                              }`}
                              title={!canPerform('manage_rooms') ? 'Requires Rooms Management permission' : 'Delete Channel'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* ── Expanded Member Directory ──────────────── */}
                        {expandedRoomId === room.id && (
                          <div className="border-t border-slate-200 dark:border-slate-800/80 bg-[#080b13]/70 px-6 py-5 space-y-5">
                            {/* Header + Add Member */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                                  <Users size={15} className="text-indigo-400" />
                                  Member Directory — <span className="text-indigo-400">{room.name || 'Group Channel'}</span>
                                </h4>
                                <p className="text-slate-500 text-[11px] mt-0.5">
                                  {room.members.length} active member{room.members.length !== 1 ? 's' : ''} · Created {formatDate(room.createdAt)}
                                </p>
                              </div>

                              {/* Add Member Control */}
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                  value={addMemberUserId}
                                  onChange={e => setAddMemberUserId(e.target.value)}
                                  disabled={!canPerform('manage_rooms')}
                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-1 sm:max-w-[220px]"
                                >
                                  <option value="">Select user to add...</option>
                                  {users
                                    .filter(u => !room.members.some((m: any) => m.id === u.id))
                                    .map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                      </option>
                                    ))
                                  }
                                </select>
                                <button
                                  onClick={() => handleAddChannelMember(room.id)}
                                  disabled={!addMemberUserId || !canPerform('manage_rooms')}
                                  className={`px-4 py-2 text-xs font-bold rounded-xl transition border shrink-0 ${
                                    addMemberUserId && canPerform('manage_rooms')
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent cursor-pointer'
                                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                                  }`}
                                  title={!canPerform('manage_rooms') ? 'Requires Rooms Management permission' : 'Add member'}
                                >
                                  + Add Member
                                </button>
                              </div>
                            </div>

                            {/* Member Table */}
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-slate-900/60">
                                    <th className="py-3 px-4">Member</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Joined</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40 text-xs">
                                  {room.members.length > 0 ? (
                                    room.members.map((member: any) => (
                                      <tr key={member.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors">
                                        {/* Member Name + Avatar */}
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/25 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0">
                                              {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                              <span className="font-bold text-slate-800 block">{member.name}</span>
                                              <span className="text-[9px] text-slate-500">ID: {member.id}</span>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Email */}
                                        <td className="py-3 px-4">
                                          <span className="text-slate-300 font-mono text-[11px] bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-800/50 select-all">
                                            {member.email}
                                          </span>
                                        </td>

                                        {/* Joined Date */}
                                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                          {member.joinedAt ? formatDate(member.joinedAt) : '—'}
                                        </td>

                                        {/* Role/Admin Badge */}
                                        <td className="py-3 px-4">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                            member.isAdmin
                                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                              : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                                          }`}>
                                            {member.isAdmin ? '★ Channel Admin' : 'Member'}
                                          </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4">
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              onClick={() => handleToggleChannelAdmin(room.id, member.id)}
                                              disabled={!canPerform('manage_rooms') || memberActionLoading === member.id}
                                              className={`px-2.5 py-1 rounded-lg border transition font-bold text-[10px] ${
                                                canPerform('manage_rooms')
                                                  ? member.isAdmin
                                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 cursor-pointer'
                                                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 cursor-pointer'
                                                  : 'opacity-30 cursor-not-allowed border-transparent bg-slate-800/30 text-slate-650'
                                              }`}
                                              title={!canPerform('manage_rooms') ? 'Requires Rooms Management permission' : member.isAdmin ? 'Demote from admin' : 'Promote to admin'}
                                            >
                                              {memberActionLoading === member.id
                                                ? 'Updating...'
                                                : member.isAdmin ? 'Demote' : 'Promote'}
                                            </button>
                                            <button
                                              onClick={() => handleRemoveChannelMember(room.id, member.id)}
                                              disabled={!canPerform('manage_rooms') || memberActionLoading === member.id}
                                              className={`p-1.5 rounded-lg border transition ${
                                                canPerform('manage_rooms')
                                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white cursor-pointer'
                                                  : 'opacity-30 cursor-not-allowed border-transparent text-slate-650'
                                              }`}
                                              title={!canPerform('manage_rooms') ? 'Requires Rooms Management permission' : 'Remove from channel'}
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="py-8 text-center text-slate-600 font-semibold">
                                        No members in this channel yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 font-semibold">
                    No channels or rooms match your search.
                  </div>
                )}
              </div>
            )}


            {/* ── TAB: FILES ──────────────────────────────────────────────────── */}
            {activeTab === 'files' && (
              <div className="space-y-5 animate-fade-in">
                {/* Filter */}
                <div className="flex items-center bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search files by file name or uploader..."
                      value={fileQuery}
                      onChange={e => setFileQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Grid */}
                {filteredFiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredFiles.map(file => (
                      <div key={file.id} className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:border-slate-700/80 transition duration-300">
                        <div>
                          {/* File Icon & Type */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm">
                              <FileText size={20} />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold font-mono uppercase bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                              {file.fileType.split('/')[1] || 'FILE'}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm truncate mb-1" title={file.fileName}>
                            {file.fileName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold block mb-4">
                            {formatBytes(file.fileSize)}
                          </span>

                          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Uploaded By:</span>
                              <span className="text-slate-700 font-semibold truncate max-w-[120px]" title={file.uploader?.name}>
                                {file.uploader?.name || 'Deleted User'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Room ID:</span>
                              <span className="text-slate-300 font-mono font-semibold">{file.roomId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-5 pt-3 border-t border-slate-800/40">
                          <a
                            href={`${API_URL}${file.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/40 transition cursor-pointer"
                          >
                            Preview
                          </a>
                          <button
                            onClick={() => {
                              if (!canPerform('manage_files')) return;
                              setSelectedFile(file);
                              setShowDeleteFileModal(true);
                            }}
                            disabled={!canPerform('manage_files')}
                            className={`p-2 rounded-xl transition border ${
                              canPerform('manage_files')
                                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border-rose-500/15 cursor-pointer'
                                : 'opacity-30 cursor-not-allowed border-transparent bg-slate-800/40 text-slate-650'
                            }`}
                            title={!canPerform('manage_files') ? 'Requires Files Management permission' : 'Delete File'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 font-semibold">
                    No uploaded files match your filters.
                  </div>
                )}
              </div>
            )}


            {/* ── TAB: CALLS ──────────────────────────────────────────────────── */}
            {activeTab === 'calls' && (
              <div className="space-y-5 animate-fade-in">
                {/* Filter */}
                <div className="flex items-center bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search call sessions by caller name or channel..."
                      value={callQuery}
                      onChange={e => setCallQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Cards Grid */}
                {filteredCalls.length > 0 ? (
                  <div className="space-y-4">
                    {filteredCalls.map(call => {
                      const participants: Array<{id: number; name: string; joinedAt: string}> = Array.isArray(call.participants) ? call.participants : [];
                      const callStatusColor = call.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : call.status === 'active'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : call.status === 'missed'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                      return (
                        <div key={call.id} className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-slate-700/60 transition duration-300">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                            {/* Left: Session ID + Room */}
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
                                <Video size={18} />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-800 text-sm block">
                                  {call.room?.name || `Room ${call.roomId}`}
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold ml-2">
                                    ({call.room?.isGroup ? 'Group Channel' : 'DM'})
                                  </span>
                                </span>
                                <span className="text-slate-500 text-[10px] font-mono">SESSION #{call.id}</span>
                              </div>
                            </div>

                            {/* Right: Status Badge + Duration */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1.5 text-slate-700 text-xs font-mono font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                <Clock size={12} className="text-slate-500" />
                                <span>{call.duration}s</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${callStatusColor}`}>
                                {call.status}
                              </span>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                            {/* Started by */}
                            <div>
                              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Started By</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-[9px] font-bold text-indigo-400">
                                  {call.callerName.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-white font-semibold text-xs">{call.callerName}</span>
                              </div>
                            </div>

                            {/* Participants / Who joined */}
                            <div>
                              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                                Participants Joined ({participants.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {participants.length > 0 ? participants.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-slate-655"
                                    title={p.joinedAt ? `Joined: ${formatDate(p.joinedAt)}` : ''}
                                  >
                                    <span>{p.name}</span>
                                    {p.joinedAt && (
                                      <span className="text-slate-500 text-[9px]">{new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                  </span>
                                )) : (
                                  <span className="text-slate-600 text-xs italic">No participants recorded</span>
                                )}
                              </div>
                            </div>

                            {/* Timestamps */}
                            <div>
                              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Timeline</span>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-14 shrink-0">Started:</span>
                                  <span className="text-slate-700 font-semibold">{formatDate(call.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-14 shrink-0">Ended:</span>
                                  <span className={call.endedAt ? 'text-slate-700 font-semibold' : 'text-slate-600 italic'}>
                                    {call.endedAt ? formatDate(call.endedAt) : '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 font-semibold">
                    No WebRTC call history matches your filters.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: PERMISSIONS ────────────────────────────────────────────── */}
            {activeTab === 'permissions' && currentUser?.role === 'superadmin' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-indigo-400" />
                    Configure Admin Role Permissions
                  </h3>
                  <p className="text-slate-500 text-xs mb-6">
                    Configure action-level privileges for standard administrators. Superadmins always have full dynamic access.
                  </p>

                  <div className="divide-y divide-slate-100 space-y-4">
                    {[
                      { action: 'manage_users', label: 'User Directory Management', desc: 'Allows adding new users, modifying profiles, resetting passwords, and deleting standard accounts.' },
                      { action: 'manage_rooms', label: 'Rooms & Channels Management', desc: 'Allows deleting groups/rooms, adding or removing members, and promoting/demoting room admins.' },
                      { action: 'manage_files', label: 'Shared Files Management', desc: 'Allows auditing and permanently deleting files shared by workspace users.' },
                      { action: 'trigger_backup', label: 'Trigger Google Drive Backup', desc: 'Allows manually initiating a backup of all chat data and SQLite database to Google Drive.' },
                    ].map(({ action, label, desc }) => {
                      const dbRecord = rolePermissions.find(p => p.role === 'admin' && p.action === action);
                      const isAllowed = dbRecord ? dbRecord.allowed : false;

                      return (
                        <div key={action} className="flex items-start justify-between py-4 first:pt-0 last:pb-0 gap-6">
                          <div className="space-y-1">
                            <span className="text-sm font-extrabold text-slate-800 block">{label}</span>
                            <span className="text-xs text-slate-500 block max-w-xl">{desc}</span>
                            <span className="text-[10px] text-indigo-650/80 font-mono block">Action ID: {action}</span>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              disabled={actionLoading}
                              onChange={(e) => {
                                const newval = e.target.checked;
                                handleSavePermissions('admin', { [action]: newval });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* ── MODAL: EDIT USER ───────────────────────────────────────────────────── */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Edit size={16} className="text-indigo-400" />
                Edit Workspace User
              </h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Security Role
                </label>
                <select
                  value={editRole}
                  disabled={currentUser?.role !== 'superadmin'}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="user">User (Regular Participant)</option>
                  <option value="admin">Admin (Channel and File manager)</option>
                  <option value="superadmin">Super Admin (Full dashboard access)</option>
                </select>
                {currentUser?.role !== 'superadmin' && (
                  <span className="text-[10px] text-slate-500 mt-1 block">Only superadmins can modify security roles.</span>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ─────────────────────────────────────────────── */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Key size={16} className="text-amber-400" />
                Force Reset Password
              </h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-xl text-xs">
                You are forcing a password reset for <strong className="text-white">{selectedUser.name}</strong>. They will need to use this password on their next login.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setShowResetPasswordModal(false);
                  }}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE USER ─────────────────────────────────────────────────── */}
      {showDeleteUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Delete User Account
              </h3>
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-400 text-xs leading-relaxed">
                <strong>Warning:</strong> Deleting <strong className="text-white">{selectedUser.name}</strong> will remove their login account and all their chat messages, reactions, calls, and files permanently. This action cannot be undone.
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowDeleteUserModal(false)}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ROOM ─────────────────────────────────────────────────── */}
      {showDeleteRoomModal && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Delete Discussion Room
              </h3>
              <button
                onClick={() => setShowDeleteRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-400 text-xs leading-relaxed">
                <strong>Warning:</strong> Deleting room <strong className="text-white">&quot;{selectedRoom.name || 'Group Channel'}&quot;</strong> will delete all discussion history, shared attachments, call sessions, and participant records associated with this chat room.
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowDeleteRoomModal(false)}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRoom}
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE FILE ─────────────────────────────────────────────────── */}
      {showDeleteFileModal && selectedFile && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Delete Shared File
              </h3>
              <button
                onClick={() => setShowDeleteFileModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-400 text-xs leading-relaxed">
                <strong>Warning:</strong> You are about to delete <strong className="text-white">{selectedFile.fileName}</strong>. This will delete the file record in the database and permanently delete the physical file from the server storage disk.
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowDeleteFileModal(false)}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFile}
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD USER ────────────────────────────────────────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Create New User
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Security Role
                </label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-350 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="user">User (Regular Participant)</option>
                  <option value="admin">Admin (Channel and File manager)</option>
                  <option value="superadmin">Super Admin (Full dashboard access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
