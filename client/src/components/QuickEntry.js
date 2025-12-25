import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function QuickEntry() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
    const isAM = today.getHours() < 12;

    // 狀態
    const [elders, setElders] = useState([]);
    const [todayActivity, setTodayActivity] = useState({ topic: '', activityName: '', materials: '' });
    const [lunchStores, setLunchStores] = useState([]);
    const [lunchOrders, setLunchOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // 載入資料
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 載入長者名單
                const elderRes = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                const elderList = elderRes.data || [];

                // 載入上次出席紀錄，預設勾選
                const lastRecord = localStorage.getItem(`last_attendance`);
                const lastAttendees = lastRecord ? JSON.parse(lastRecord) : [];

                setElders(elderList.map(e => ({
                    ...e,
                    attended: lastAttendees.includes(e.name),
                    pickupAM: lastAttendees.includes(e.name),
                    pickupPM: lastAttendees.includes(e.name),
                    lunch: lastAttendees.includes(e.name),
                    identity: e.identity || '長者',
                })));

                // 從每週課表載入今日活動
                const quarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;
                const schedule = localStorage.getItem(`weekly_schedule_${quarter}`);
                if (schedule) {
                    const parsed = JSON.parse(schedule);
                    const period = isAM ? 'am' : 'pm';
                    if (parsed[dayKey] && parsed[dayKey][period]) {
                        setTodayActivity(parsed[dayKey][period]);
                    }
                }

                // 載入便當店
                const stores = localStorage.getItem('lunchbox_stores');
                if (stores) {
                    setLunchStores(JSON.parse(stores));
                }

            } catch (err) {
                console.error('載入失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [dayKey, isAM]);

    // 切換勾選
    const toggle = (index, field) => {
        setElders(prev => prev.map((e, i) =>
            i === index ? { ...e, [field]: !e[field] } : e
        ));
    };

    // 全選 / 取消全選
    const toggleAll = (field) => {
        const allChecked = elders.every(e => e[field]);
        setElders(prev => prev.map(e => ({ ...e, [field]: !allChecked })));
    };

    // 同步勾選（出席時自動勾選其他項目）
    const toggleAttended = (index) => {
        setElders(prev => prev.map((e, i) => {
            if (i !== index) return e;
            const newAttended = !e.attended;
            return {
                ...e,
                attended: newAttended,
                pickupAM: newAttended ? e.pickupAM : false,
                pickupPM: newAttended ? e.pickupPM : false,
                lunch: newAttended ? e.lunch : false,
            };
        }));
    };

    // 新增便當
    const addLunch = (store) => {
        setLunchOrders(prev => [...prev, { ...store, quantity: 1 }]);
    };

    // 計算統計
    const stats = {
        attended: elders.filter(e => e.attended).length,
        pickupAM: elders.filter(e => e.pickupAM).length,
        pickupPM: elders.filter(e => e.pickupPM).length,
        lunch: elders.filter(e => e.lunch).length,
        lunchTotal: lunchOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0),
    };

    // 儲存
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 儲存出席紀錄
            const attendees = elders.filter(e => e.attended).map(e => e.name);
            localStorage.setItem('last_attendance', JSON.stringify(attendees));

            // 儲存收費紀錄
            const feeRecord = {
                date: todayStr,
                participants: elders,
                lunchOrders,
                stats,
            };
            localStorage.setItem(`fee_record_${todayStr}`, JSON.stringify(feeRecord));

            // 顯示成功訊息
            setSuccessMessage(`今日出席 ${stats.attended} 人\n來程 ${stats.pickupAM} 人 / 回程 ${stats.pickupPM} 人\n便當 ${stats.lunch} 人`);
            setShowSuccess(true);

            // 3秒後隱藏
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (err) {
            alert('儲存失敗：' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <div className="spinner-border text-primary" role="status"></div>
                <p style={{ marginTop: '15px', fontSize: '18px' }}>載入中...</p>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '100%',
            padding: '15px',
            paddingBottom: '100px',
            fontSize: '16px'
        }}>
            {/* 成功動畫 */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                }}>
                    <div style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '40px',
                        borderRadius: '20px',
                        textAlign: 'center',
                        animation: 'fadeIn 0.3s'
                    }}>
                        <div style={{ fontSize: '60px', marginBottom: '15px' }}>✓</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>已儲存！</div>
                        <div style={{ fontSize: '18px', whiteSpace: 'pre-line' }}>{successMessage}</div>
                    </div>
                </div>
            )}

            {/* 標題區 */}
            <div style={{
                textAlign: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#1976D2',
                color: 'white',
                borderRadius: '10px'
            }}>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    {today.getFullYear()}/{String(today.getMonth() + 1).padStart(2, '0')}/{String(today.getDate()).padStart(2, '0')} ({weekDays[today.getDay()]}) {isAM ? '上午' : '下午'}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '5px' }}>
                    {todayActivity.topic || '今日活動'}
                </div>
                {todayActivity.activityName && (
                    <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9 }}>
                        {todayActivity.activityName}
                    </div>
                )}
            </div>

            {/* 快速全選按鈕 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '15px'
            }}>
                <button
                    onClick={() => toggleAll('attended')}
                    style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                    }}
                >
                    全選<br />出席
                </button>
                <button
                    onClick={() => toggleAll('pickupAM')}
                    style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                    }}
                >
                    全選<br />來程
                </button>
                <button
                    onClick={() => toggleAll('pickupPM')}
                    style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        backgroundColor: '#9C27B0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                    }}
                >
                    全選<br />回程
                </button>
                <button
                    onClick={() => toggleAll('lunch')}
                    style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                    }}
                >
                    全選<br />便當
                </button>
            </div>

            {/* 長者勾選區 */}
            <div style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '15px'
            }}>
                {/* 表頭 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr repeat(4, 50px)',
                    backgroundColor: '#e0e0e0',
                    padding: '10px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    <div style={{ textAlign: 'left' }}>姓名</div>
                    <div>出席</div>
                    <div>來程</div>
                    <div>回程</div>
                    <div>便當</div>
                </div>

                {/* 長者列表 */}
                {elders.map((elder, index) => (
                    <div
                        key={elder.id || index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr repeat(4, 50px)',
                            padding: '12px 10px',
                            borderBottom: '1px solid #e0e0e0',
                            alignItems: 'center',
                            backgroundColor: elder.attended ? '#E8F5E9' : 'white',
                        }}
                    >
                        <div style={{
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {elder.name}
                            {elder.identity !== '長者' && (
                                <span style={{
                                    fontSize: '10px',
                                    backgroundColor: '#FF5722',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    {elder.identity}
                                </span>
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="checkbox"
                                checked={elder.attended}
                                onChange={() => toggleAttended(index)}
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="checkbox"
                                checked={elder.pickupAM}
                                onChange={() => toggle(index, 'pickupAM')}
                                disabled={!elder.attended}
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="checkbox"
                                checked={elder.pickupPM}
                                onChange={() => toggle(index, 'pickupPM')}
                                disabled={!elder.attended}
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="checkbox"
                                checked={elder.lunch}
                                onChange={() => toggle(index, 'lunch')}
                                disabled={!elder.attended}
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 便當快速選擇 */}
            {lunchStores.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🍱 便當</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {lunchStores.map(store => (
                            <button
                                key={store.id}
                                onClick={() => addLunch(store)}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#FFF3E0',
                                    border: '2px solid #FF9800',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                }}
                            >
                                {store.name} ${store.price}
                            </button>
                        ))}
                    </div>
                    {lunchOrders.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            {lunchOrders.map((order, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '5px'
                                }}>
                                    <span>{order.name}</span>
                                    <input
                                        type="number"
                                        value={order.quantity}
                                        onChange={(e) => {
                                            const qty = parseInt(e.target.value) || 0;
                                            setLunchOrders(prev => prev.map((o, idx) =>
                                                idx === i ? { ...o, quantity: qty } : o
                                            ));
                                        }}
                                        style={{ width: '60px', padding: '5px', textAlign: 'center' }}
                                        min="1"
                                    />
                                    <span>= ${order.price * order.quantity}</span>
                                    <button
                                        onClick={() => setLunchOrders(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 統計摘要 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '20px'
            }}>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#E8F5E9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.attended}</div>
                    <div style={{ fontSize: '12px' }}>出席</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#E3F2FD', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>{stats.pickupAM}</div>
                    <div style={{ fontSize: '12px' }}>來程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#F3E5F5', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9C27B0' }}>{stats.pickupPM}</div>
                    <div style={{ fontSize: '12px' }}>回程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#FFF3E0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>{stats.lunch}</div>
                    <div style={{ fontSize: '12px' }}>便當</div>
                </div>
            </div>

            {/* 底部固定按鈕 */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '15px',
                backgroundColor: 'white',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                display: 'flex',
                gap: '10px'
            }}>
                <Link
                    to="/"
                    style={{
                        flex: 1,
                        padding: '15px',
                        backgroundColor: '#9E9E9E',
                        color: 'white',
                        textAlign: 'center',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '18px',
                    }}
                >
                    ← 返回
                </Link>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        flex: 2,
                        padding: '15px',
                        backgroundColor: isSaving ? '#BDBDBD' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                    }}
                >
                    {isSaving ? '儲存中...' : '✓ 儲存今日紀錄'}
                </button>
            </div>
        </div>
    );
}

export default QuickEntry;
