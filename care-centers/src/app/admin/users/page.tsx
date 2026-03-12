'use client';

import { useState, useEffect } from 'react';
import { useAuth, userManagementApi } from '@/context/AuthContext';
import { User, UserRole, ROLE_CONFIG } from '@/types/user';
import { getAllSites } from '@/config/sites';
import Link from 'next/link';

export default function UsersPage() {
    const { user: currentUser, canManageUsers, logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        password: '',
        role: 'staff' as UserRole,
        siteId: 'sanxing',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const sites = getAllSites();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const data = await userManagementApi.getUsers();
        setUsers(data as User[]);
    };

    const handleAddUser = async () => {
        setError('');
        setSuccess('');

        if (!newUser.name.trim()) {
            setError('請輸入帳號名稱');
            return;
        }

        // 預設密碼為姓名+123
        const password = newUser.password.trim() || `${newUser.name.trim()}123`;

        const result = await userManagementApi.addUser({
            name: newUser.name.trim(),
            password,
            role: newUser.role,
            siteId: newUser.siteId,
        });

        if (result.success) {
            setSuccess(`新增成功！初始密碼：${password}`);
            setNewUser({ name: '', password: '', role: 'staff', siteId: 'sanxing' });
            setShowAddForm(false);
            loadUsers();
        } else {
            setError(result.message);
        }
    };

    const handleDeleteUser = async (e: React.MouseEvent, userId: string, userName: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm(`確定要刪除「${userName}」嗎？\n\n此操作無法復原！`)) return;

        const result = await userManagementApi.deleteUser(userName);
        if (result.success) {
            setSuccess('刪除成功');
            loadUsers();
        } else {
            setError(result.message);
        }
    };

    const handleResetPassword = async (e: React.MouseEvent, userId: string, userName: string) => {
        e.preventDefault();
        e.stopPropagation();

        const newPassword = `${userName}123`;
        if (!window.confirm(`確定要重設「${userName}」的密碼嗎？\n\n新密碼將設為：${newPassword}`)) return;

        const result = await userManagementApi.resetPassword(userName, newPassword);
        if (result.success) {
            setSuccess(`密碼已重設為：${newPassword}`);
        } else {
            setError(result.message);
        }
    };

    if (!canManageUsers) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">無權限存取</h1>
                    <p className="text-gray-600 mb-4">只有超級管理者可以管理用戶帳號</p>
                    <Link href="/" className="text-blue-500 hover:underline">返回首頁</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 頂部導航 */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-white/80 hover:text-white">←</Link>
                        <h1 className="text-lg font-bold">👥 用戶管理</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm opacity-80">{currentUser?.name}</span>
                        <button onClick={logout} className="text-sm bg-white/20 px-2 py-1 rounded">
                            登出
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4">
                {/* 訊息提示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
                        ⚠️ {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
                        ✅ {success}
                    </div>
                )}

                {/* 新增用戶按鈕 */}
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full mb-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition"
                >
                    {showAddForm ? '取消新增' : '+ 新增用戶'}
                </button>

                {/* 新增用戶表單 */}
                {showAddForm && (
                    <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                        <h2 className="font-bold text-gray-800 mb-4">新增用戶</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">帳號（員工姓名）*</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="例如：王小明"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">密碼（留空則為姓名+123）</label>
                                <input
                                    type="text"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="留空則預設為：姓名123"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">角色</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">所屬據點</label>
                                <select
                                    value={newUser.siteId}
                                    onChange={(e) => setNewUser({ ...newUser, siteId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="all">全部據點</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAddUser}
                                className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
                            >
                                確認新增
                            </button>
                        </div>
                    </div>
                )}

                {/* 用戶列表 */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b">
                        <h2 className="font-bold text-gray-800">用戶列表（{users.length}）</h2>
                    </div>
                    <div className="divide-y">
                        {users.map(u => (
                            <div key={u.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{u.name}</span>
                                        <span
                                            className="px-2 py-0.5 text-xs text-white rounded-full"
                                            style={{ backgroundColor: ROLE_CONFIG[u.role].color }}
                                        >
                                            {ROLE_CONFIG[u.role].label}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {u.siteId === 'all' ? '全部據點' : sites.find(s => s.id === u.siteId)?.name || u.siteId}
                                        {u.lastLogin && ` • 最後登入: ${new Date(u.lastLogin).toLocaleDateString()}`}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleResetPassword(e, u.id, u.name)}
                                        className="px-3 py-1 text-sm bg-orange-100 text-orange-600 rounded hover:bg-orange-200"
                                    >
                                        重設密碼
                                    </button>
                                    {u.id !== currentUser?.userId && (
                                        <button
                                            onClick={(e) => handleDeleteUser(e, u.id, u.name)}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                                        >
                                            刪除
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
