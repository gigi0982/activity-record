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

    const [elders, setElders] = useState([]);
    const [todayActivity, setTodayActivity] = useState({ topic: '', activityName: '' });
    const [lunchStores, setLunchStores] = useState([]);
    const [lunchOrders, setLunchOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
                pickupAM: newAttended, pickupPM: newAttended, lunch: newAttended,
                caregiverAM: false, caregiverPM: false, caregiverLunch: false,
            };
        }));
    };

    const addLunch = (store) => setLunchOrders(prev => [...prev, { ...store, quantity: 1 }]);

    const stats = {
        attended: elders.filter(e => e.attended).length,
        pickupAM: elders.filter(e => e.pickupAM).length,
        pickupPM: elders.filter(e => e.pickupPM).length,
        lunch: elders.filter(e => e.lunch).length,
        caregiverAM: elders.filter(e => e.caregiverAM).length,
        caregiverPM: elders.filter(e => e.caregiverPM).length,
        caregiverLunch: elders.filter(e => e.caregiverLunch).length,
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const attendees = elders.filter(e => e.attended).map(e => e.name);
            const feeData = { date: todayStr, participants: elders, lunchOrders, stats };

            // 儲存到 localStorage
            localStorage.setItem('last_attendance', JSON.stringify(attendees));
            localStorage.setItem(`fee_record_${todayStr}`, JSON.stringify(feeData));

            // 同步到後端 API
            try {
                await axios.post(`${API_BASE_URL}/api/fee-records`, feeData);
            } catch (apiError) {
                console.log('後端同步失敗，資料已存在本地', apiError);
            }

            setSuccessMessage(`出席 ${stats.attended} 人\n長者接送：${stats.pickupAM}/${stats.pickupPM}\n外勞接送：${stats.caregiverAM}/${stats.caregiverPM}`);
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
                <div className="spinner-border text-primary"></div>
                <p style={{ marginTop: '15px' }}>載入中...</p>
            </div>
        );
    }

    const CheckBox = ({ checked, onChange, disabled, color }) => (
        <div
            onClick={!disabled ? onChange : undefined}
            style={{
                width: '32px', height: '32px', borderRadius: '6px',
                border: disabled ? '2px solid #ddd' : `2px solid ${color}`,
                backgroundColor: checked ? color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
            }}
        >
            {checked && <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>✓</span>}
        </div>
    );

    return (
        <div style={{ maxWidth: '100%', padding: '10px', paddingBottom: '100px' }}>
            {/* 成功動畫 */}
            {showSuccess && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div style={{ backgroundColor: '#4CAF50', color: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '60px' }}>✓</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>已儲存！</div>
                        <div style={{ whiteSpace: 'pre-line' }}>{successMessage}</div>
                    </div>
                </div>
            )}

            {/* 標題區 */}
            <div style={{ textAlign: 'center', marginBottom: '15px', padding: '15px', backgroundColor: '#1976D2', color: 'white', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    {today.getFullYear()}/{String(today.getMonth() + 1).padStart(2, '0')}/{String(today.getDate()).padStart(2, '0')} ({weekDays[today.getDay()]}) {isAM ? '上午' : '下午'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                    {todayActivity.topic || '今日活動'}
                </div>
            </div>

            {/* 快速全選區 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => toggleAll('attended')} style={{
                    padding: '15px', fontSize: '16px', fontWeight: 'bold',
                    backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '10px',
                }}>
                    ✓ 全選出席
                </button>
                <button onClick={() => { toggleAll('pickupAM'); toggleAll('pickupPM'); }} style={{
                    padding: '15px', fontSize: '16px', fontWeight: 'bold',
                    backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '10px',
                }}>
                    🚐 全選接送
                </button>
            </div>

            {/* 表頭 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 36px 36px 36px 10px 36px 36px 36px',
                gap: '4px', padding: '10px 8px',
                backgroundColor: '#f0f0f0', borderRadius: '10px 10px 0 0',
                fontWeight: 'bold', fontSize: '12px', textAlign: 'center'
            }}>
                <div style={{ textAlign: 'left' }}>姓名</div>
                <div style={{ color: '#4CAF50' }}>出席</div>
                <div style={{ color: '#2196F3' }}>來</div>
                <div style={{ color: '#9C27B0' }}>回</div>
                <div></div>
                <div style={{ color: '#FF5722' }}>外來</div>
                <div style={{ color: '#E91E63' }}>外回</div>
                <div style={{ color: '#FF9800' }}>外餐</div>
            </div>

            {/* 長者列表 */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '0 0 10px 10px', marginBottom: '15px' }}>
                {elders.map((elder, index) => (
                    <div
                        key={elder.id || index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 36px 36px 36px 10px 36px 36px 36px',
                            gap: '4px', padding: '10px 8px',
                            borderBottom: '1px solid #eee',
                            alignItems: 'center',
                            backgroundColor: elder.attended ? '#E8F5E9' : 'white',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{elder.name}</div>
                        <CheckBox checked={elder.attended} onChange={() => toggleAttended(index)} color="#4CAF50" />
                        <CheckBox checked={elder.pickupAM} onChange={() => toggle(index, 'pickupAM')} disabled={!elder.attended} color="#2196F3" />
                        <CheckBox checked={elder.pickupPM} onChange={() => toggle(index, 'pickupPM')} disabled={!elder.attended} color="#9C27B0" />
                        <div style={{ width: '2px', height: '100%', backgroundColor: '#ddd', margin: '0 auto' }}></div>
                        <CheckBox checked={elder.caregiverAM} onChange={() => toggle(index, 'caregiverAM')} disabled={!elder.attended} color="#FF5722" />
                        <CheckBox checked={elder.caregiverPM} onChange={() => toggle(index, 'caregiverPM')} disabled={!elder.attended} color="#E91E63" />
                        <CheckBox checked={elder.caregiverLunch} onChange={() => toggle(index, 'caregiverLunch')} disabled={!elder.attended} color="#FF9800" />
                    </div>
                ))}
            </div>

            {/* 便當 */}
            {lunchStores.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🍱 便當訂購</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {lunchStores.map(store => (
                            <button key={store.id} onClick={() => addLunch(store)}
                                style={{ padding: '10px 15px', backgroundColor: '#FFF3E0', border: '2px solid #FF9800', borderRadius: '10px', fontSize: '14px' }}>
                                {store.name} ${store.price}
                            </button>
                        ))}
                    </div>
                    {lunchOrders.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            {lunchOrders.map((order, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                    <span>{order.name}</span>
                                    <input type="number" value={order.quantity} min="1"
                                        onChange={(e) => setLunchOrders(prev => prev.map((o, idx) => idx === i ? { ...o, quantity: parseInt(e.target.value) || 0 } : o))}
                                        style={{ width: '50px', padding: '5px', textAlign: 'center' }} />
                                    <span>= ${order.price * order.quantity}</span>
                                    <button onClick={() => setLunchOrders(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 統計區 */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px',
                padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.attended}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>出席</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>{stats.pickupAM}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>長者來程</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9C27B0' }}>{stats.pickupPM}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>長者回程</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF5722' }}>{stats.caregiverAM + stats.caregiverPM}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>外勞接送</div>
                </div>
            </div>

            {/* 底部按鈕 */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px',
                backgroundColor: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                display: 'flex', gap: '10px', zIndex: 100
            }}>
                <Link to="/" style={{
                    flex: 1, padding: '16px', backgroundColor: '#9E9E9E', color: 'white',
                    textAlign: 'center', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', fontWeight: 'bold'
                }}>← 返回</Link>
                <button onClick={handleSave} disabled={isSaving} style={{
                    flex: 2, padding: '16px', backgroundColor: isSaving ? '#BDBDBD' : '#4CAF50',
                    color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold'
                }}>{isSaving ? '儲存中...' : '✓ 儲存今日紀錄'}</button>
            </div>
        </div>
    );
}

export default QuickEntry;
