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
                const elderRes = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                const elderList = elderRes.data || [];
                const lastRecord = localStorage.getItem(`last_attendance`);
                const lastAttendees = lastRecord ? JSON.parse(lastRecord) : [];

                setElders(elderList.map(e => ({
                    ...e,
                    attended: lastAttendees.includes(e.name),
                    pickupAM: lastAttendees.includes(e.name),
                    pickupPM: lastAttendees.includes(e.name),
                    lunch: lastAttendees.includes(e.name),
                    // 外勞欄位
                    caregiverAM: false,
                    caregiverPM: false,
                    caregiverLunch: false,
                })));

                const quarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;
                const schedule = localStorage.getItem(`weekly_schedule_${quarter}`);
                if (schedule) {
                    const parsed = JSON.parse(schedule);
                    const period = isAM ? 'am' : 'pm';
                    if (parsed[dayKey] && parsed[dayKey][period]) {
                        setTodayActivity(parsed[dayKey][period]);
                    }
                }

                const stores = localStorage.getItem('lunchbox_stores');
                if (stores) setLunchStores(JSON.parse(stores));

            } catch (err) {
                console.error('載入失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [dayKey, isAM]);

    const toggle = (index, field) => {
        setElders(prev => prev.map((e, i) => i === index ? { ...e, [field]: !e[field] } : e));
    };

    const toggleAll = (field) => {
        const allChecked = elders.every(e => e[field]);
        setElders(prev => prev.map(e => ({ ...e, [field]: !allChecked })));
    };

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
                caregiverAM: newAttended ? e.caregiverAM : false,
                caregiverPM: newAttended ? e.caregiverPM : false,
                caregiverLunch: newAttended ? e.caregiverLunch : false,
            };
        }));
    };

    const addLunch = (store) => {
        setLunchOrders(prev => [...prev, { ...store, quantity: 1 }]);
    };

    // 計算統計（包含外勞）
    const stats = {
        attended: elders.filter(e => e.attended).length,
        pickupAM: elders.filter(e => e.pickupAM).length,
        pickupPM: elders.filter(e => e.pickupPM).length,
        lunch: elders.filter(e => e.lunch).length,
        caregiverAM: elders.filter(e => e.caregiverAM).length,
        caregiverPM: elders.filter(e => e.caregiverPM).length,
        caregiverLunch: elders.filter(e => e.caregiverLunch).length,
        lunchTotal: lunchOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0),
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const attendees = elders.filter(e => e.attended).map(e => e.name);
            localStorage.setItem('last_attendance', JSON.stringify(attendees));

            const feeRecord = { date: todayStr, participants: elders, lunchOrders, stats };
            localStorage.setItem(`fee_record_${todayStr}`, JSON.stringify(feeRecord));

            setSuccessMessage(
                `出席 ${stats.attended} 人\n` +
                `長者接送：來程 ${stats.pickupAM} / 回程 ${stats.pickupPM}\n` +
                `外勞接送：來程 ${stats.caregiverAM} / 回程 ${stats.caregiverPM}\n` +
                `便當：長者 ${stats.lunch} / 外勞 ${stats.caregiverLunch}`
            );
            setShowSuccess(true);
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
        <div style={{ maxWidth: '100%', padding: '10px', paddingBottom: '100px', fontSize: '14px' }}>
            {/* 成功動畫 */}
            {showSuccess && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div style={{
                        backgroundColor: '#4CAF50', color: 'white', padding: '30px',
                        borderRadius: '20px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>✓</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>已儲存！</div>
                        <div style={{ fontSize: '14px', whiteSpace: 'pre-line' }}>{successMessage}</div>
                    </div>
                </div>
            )}

            {/* 標題區 */}
            <div style={{
                textAlign: 'center', marginBottom: '15px', padding: '12px',
                backgroundColor: '#1976D2', color: 'white', borderRadius: '10px'
            }}>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {today.getFullYear()}/{String(today.getMonth() + 1).padStart(2, '0')}/{String(today.getDate()).padStart(2, '0')} ({weekDays[today.getDay()]}) {isAM ? '上午' : '下午'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '3px' }}>
                    {todayActivity.topic || '今日活動'}
                </div>
            </div>

            {/* 長者勾選區 - 7欄 */}
            <div style={{ backgroundColor: '#f5f5f5', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
                {/* 表頭 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr repeat(3, 40px) 8px repeat(3, 40px)',
                    backgroundColor: '#e0e0e0', padding: '8px 5px',
                    fontWeight: 'bold', fontSize: '11px', textAlign: 'center', alignItems: 'center'
                }}>
                    <div style={{ textAlign: 'left', paddingLeft: '5px' }}>姓名</div>
                    <div style={{ color: '#4CAF50' }}>出席</div>
                    <div style={{ color: '#2196F3' }}>來</div>
                    <div style={{ color: '#9C27B0' }}>回</div>
                    <div style={{ backgroundColor: '#bbb', width: '2px', height: '100%', margin: '0 auto' }}></div>
                    <div style={{ color: '#FF5722' }}>外來</div>
                    <div style={{ color: '#E91E63' }}>外回</div>
                    <div style={{ color: '#FF9800' }}>外餐</div>
                </div>

                {/* 長者列表 */}
                {elders.map((elder, index) => (
                    <div
                        key={elder.id || index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr repeat(3, 40px) 8px repeat(3, 40px)',
                            padding: '10px 5px', borderBottom: '1px solid #e0e0e0',
                            alignItems: 'center',
                            backgroundColor: elder.attended ? '#E8F5E9' : 'white',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', fontSize: '13px', paddingLeft: '5px' }}>
                            {elder.name}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.attended} onChange={() => toggleAttended(index)}
                                style={{ width: '22px', height: '22px' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.pickupAM} onChange={() => toggle(index, 'pickupAM')}
                                disabled={!elder.attended} style={{ width: '22px', height: '22px' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.pickupPM} onChange={() => toggle(index, 'pickupPM')}
                                disabled={!elder.attended} style={{ width: '22px', height: '22px' }} />
                        </div>
                        <div style={{ backgroundColor: '#ddd', width: '2px', height: '100%', margin: '0 auto' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.caregiverAM} onChange={() => toggle(index, 'caregiverAM')}
                                disabled={!elder.attended} style={{ width: '22px', height: '22px' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.caregiverPM} onChange={() => toggle(index, 'caregiverPM')}
                                disabled={!elder.attended} style={{ width: '22px', height: '22px' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={elder.caregiverLunch} onChange={() => toggle(index, 'caregiverLunch')}
                                disabled={!elder.attended} style={{ width: '22px', height: '22px' }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* 便當快速選擇 */}
            {lunchStores.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>🍱 便當訂購</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {lunchStores.map(store => (
                            <button key={store.id} onClick={() => addLunch(store)}
                                style={{ padding: '8px 12px', backgroundColor: '#FFF3E0', border: '2px solid #FF9800', borderRadius: '8px', fontSize: '13px' }}>
                                {store.name} ${store.price}
                            </button>
                        ))}
                    </div>
                    {lunchOrders.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            {lunchOrders.map((order, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '13px' }}>{order.name}</span>
                                    <input type="number" value={order.quantity} min="1"
                                        onChange={(e) => {
                                            const qty = parseInt(e.target.value) || 0;
                                            setLunchOrders(prev => prev.map((o, idx) => idx === i ? { ...o, quantity: qty } : o));
                                        }}
                                        style={{ width: '50px', padding: '4px', textAlign: 'center' }} />
                                    <span style={{ fontSize: '13px' }}>= ${order.price * order.quantity}</span>
                                    <button onClick={() => setLunchOrders(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{ padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 統計摘要 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#E8F5E9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.attended}</div>
                    <div style={{ fontSize: '10px' }}>出席</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#E3F2FD', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2196F3' }}>{stats.pickupAM}</div>
                    <div style={{ fontSize: '10px' }}>長者來程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#F3E5F5', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9C27B0' }}>{stats.pickupPM}</div>
                    <div style={{ fontSize: '10px' }}>長者回程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#FFF3E0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF9800' }}>{stats.lunch}</div>
                    <div style={{ fontSize: '10px' }}>長者便當</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#FFEBEE', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF5722' }}>{stats.caregiverAM}</div>
                    <div style={{ fontSize: '10px' }}>外勞來程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#FCE4EC', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E91E63' }}>{stats.caregiverPM}</div>
                    <div style={{ fontSize: '10px' }}>外勞回程</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#FFF8E1', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFA000' }}>{stats.caregiverLunch}</div>
                    <div style={{ fontSize: '10px' }}>外勞餐費</div>
                </div>
            </div>

            {/* 底部固定按鈕 */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px',
                backgroundColor: 'white', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', display: 'flex', gap: '10px'
            }}>
                <Link to="/" style={{
                    flex: 1, padding: '12px', backgroundColor: '#9E9E9E', color: 'white',
                    textAlign: 'center', borderRadius: '10px', textDecoration: 'none', fontSize: '16px',
                }}>← 返回</Link>
                <button onClick={handleSave} disabled={isSaving} style={{
                    flex: 2, padding: '12px', backgroundColor: isSaving ? '#BDBDBD' : '#4CAF50',
                    color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold',
                }}>{isSaving ? '儲存中...' : '✓ 儲存今日紀錄'}</button>
            </div>
        </div>
    );
}

export default QuickEntry;
