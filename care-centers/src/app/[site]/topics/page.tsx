'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Topic {
    id: string;
    name: string;
    purposes: string[];
}

const DEFAULT_TOPICS: Topic[] = [
    { id: '1', name: '認知促進', purposes: ['提升專注力', '增進記憶力', '維持認知功能'] },
    { id: '2', name: '懷舊治療', purposes: ['增進記憶力', '情緒穩定', '促進社交互動'] },
    { id: '3', name: '音樂治療', purposes: ['情緒穩定', '提升自我表達', '增加生活參與'] },
    { id: '4', name: '藝術創作', purposes: ['提升專注力', '增進手眼協調', '提升自我表達'] },
    { id: '5', name: '體適能', purposes: ['增進手眼協調', '維持認知功能', '增加生活參與'] },
    { id: '6', name: '園藝治療', purposes: ['情緒穩定', '增加生活參與', '促進社交互動'] },
    { id: '7', name: '烹飪活動', purposes: ['維持認知功能', '增進手眼協調', '增加生活參與'] },
    { id: '8', name: '社交活動', purposes: ['促進社交互動', '情緒穩定', '增加生活參與'] },
    { id: '9', name: '生活功能訓練', purposes: ['維持認知功能', '增進手眼協調', '增加生活參與'] },
    { id: '10', name: '節慶活動', purposes: ['情緒穩定', '促進社交互動', '增加生活參與'] },
];

const ALL_PURPOSES = [
    '提升專注力',
    '增進記憶力',
    '促進社交互動',
    '維持認知功能',
    '情緒穩定',
    '增進手眼協調',
    '提升自我表達',
    '增加生活參與',
];

const STORAGE_KEY = 'activity_topics';

export default function TopicsPage() {
    const params = useParams();
    const siteId = params.site as string;

    const [topics, setTopics] = useState<Topic[]>([]);
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);

    useEffect(() => {
        loadTopics();
    }, []);

    const loadTopics = () => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setTopics(JSON.parse(saved));
        } else {
            setTopics(DEFAULT_TOPICS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TOPICS));
        }
    };

    const saveTopics = (newTopics: Topic[]) => {
        setTopics(newTopics);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTopics));
    };

    const togglePurpose = (purpose: string) => {
        setSelectedPurposes(prev =>
            prev.includes(purpose)
                ? prev.filter(p => p !== purpose)
                : [...prev, purpose]
        );
    };

    const handleAddTopic = () => {
        if (!newTopicName.trim()) {
            alert('請輸入主題名稱');
            return;
        }
        if (selectedPurposes.length === 0) {
            alert('請選擇至少一個活動目的');
            return;
        }

        const newTopic: Topic = {
            id: Date.now().toString(),
            name: newTopicName.trim(),
            purposes: selectedPurposes,
        };

        saveTopics([...topics, newTopic]);
        setNewTopicName('');
        setSelectedPurposes([]);
        setShowAddForm(false);
    };

    const handleEditTopic = () => {
        if (!editingTopic) return;
        if (selectedPurposes.length === 0) {
            alert('請選擇至少一個活動目的');
            return;
        }

        const updated = topics.map(t =>
            t.id === editingTopic.id
                ? { ...t, purposes: selectedPurposes }
                : t
        );
        saveTopics(updated);
        setEditingTopic(null);
        setSelectedPurposes([]);
    };

    const handleDeleteTopic = (id: string) => {
        if (!confirm('確定要刪除此主題嗎？')) return;
        saveTopics(topics.filter(t => t.id !== id));
    };

    const startEdit = (topic: Topic) => {
        setEditingTopic(topic);
        setSelectedPurposes(topic.purposes);
        setShowAddForm(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">🎯 活動主題管理</h1>

            {/* 新增主題按鈕 */}
            <button
                onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingTopic(null);
                    setSelectedPurposes([]);
                    setNewTopicName('');
                }}
                className="w-full mb-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition"
            >
                {showAddForm ? '取消新增' : '+ 新增活動主題'}
            </button>

            {/* 新增表單 */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                    <h2 className="font-bold text-gray-800 mb-4">新增活動主題</h2>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">主題名稱 *</label>
                        <input
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            placeholder="例如：音樂治療"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-2">活動目的 * （可多選）</label>
                        <div className="flex flex-wrap gap-2">
                            {ALL_PURPOSES.map(purpose => (
                                <button
                                    key={purpose}
                                    onClick={() => togglePurpose(purpose)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition ${selectedPurposes.includes(purpose)
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {purpose}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleAddTopic}
                        className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
                    >
                        確認新增
                    </button>
                </div>
            )}

            {/* 主題列表 */}
            <div className="space-y-3">
                {topics.map(topic => (
                    <div key={topic.id} className="bg-white rounded-xl shadow-sm p-4">
                        {editingTopic?.id === topic.id ? (
                            // 編輯模式
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg">{topic.name}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleEditTopic}
                                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                        >
                                            儲存
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingTopic(null);
                                                setSelectedPurposes([]);
                                            }}
                                            className="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_PURPOSES.map(purpose => (
                                        <button
                                            key={purpose}
                                            onClick={() => togglePurpose(purpose)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition ${selectedPurposes.includes(purpose)
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {purpose}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // 顯示模式
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg mb-2">{topic.name}</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {topic.purposes.map(purpose => (
                                            <span
                                                key={purpose}
                                                className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs"
                                            >
                                                {purpose}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEdit(topic)}
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                    >
                                        編輯
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTopic(topic.id)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 返回按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg z-40">
                <Link
                    href={`/${siteId}`}
                    className="block w-full py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 返回首頁
                </Link>
            </div>
        </div>
    );
}
