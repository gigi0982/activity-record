import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function FeeEdit() {
    const { date } = useParams();
    const navigate = useNavigate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const [elders, setElders] = useState([]);
    const [lunchOrders, setLunchOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const d = new Date(date);
    const displayDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} (${weekDays[d.getDay()]})`;

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 從後端或 localStorage 載入
                let record = null;
                try {
                    const res = await axios.get(`${API_BASE_URL}/api/fee-records/${date}`);
                    record = res.data;
                } catch {
                    const saved = localStorage.getItem(`fee_record_${date}`);
                    if (saved) record = JSON.parse(saved);
                }

                if (record && record.participants) {
                    setElders(record.participants);
                    setLunchOrders(record.lunchOrders || []);
                } else {
                    // 載入長者名單
                    const elderRes = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                    setElders((elderRes.data || []).map(e => ({
                        ...e, attended: false, pickupAM: false, pickupPM: false, lunch: false,
                        caregiverAM: false, caregiverPM: false, caregiverLunch: false,
                    })));
                }
            } catch (err) {
                console.error('載入失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [date]);

    const toggle = (index, field) => {
        setElders(prev => prev.map((e, i) => i === index ? { ...e, [field]: !e[field] } : e));
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
            const feeData = { date, participants: elders, lunchOrders, stats };
            localStorage.setItem(`fee_record_${date}`, JSON.stringify(feeData));
            try {
                await axios.post(`${API_BASE_URL}/api/fee-records`, feeData);
            } catch { }
            setShowSuccess(true);
            setTimeout(() => navigate('/fee-history'), 1500);
        } catch (err) {
            alert('儲存失敗：' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const CheckBox = ({ checked, onChange, disabled, color }) => (
        <div onClick={!disabled ? onChange : undefined}
            style={{
                width: '28px', height: '28px', borderRadius: '5px',
                border: disabled ? '2px solid #ddd' : `2px solid ${color}`,
                backgroundColor: checked ? color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
            }}>
            {checked && <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>✓</span>}
        </div>
    );

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
                <p className="mt-3">載入中...</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '80px' }}>
            {/* 成功動畫 */}
            {showSuccess && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div style={{ backgroundColor: '#4CAF50', color: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '60px' }}>✓</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>已更新！</div>
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4><i className="fas fa-edit me-2"></i>編輯 {displayDate}</h4>
                <Link to="/fee-history" className="btn btn-outline-secondary">← 返回</Link>
            </div>

            {/* 統計 */}
            <div className="row mb-3">
                <div className="col-3 text-center">
                    <div className="h4 text-success mb-0">{stats.attended}</div>
                    <small>出席</small>
                </div>
                <div className="col-3 text-center">
                    <div className="h4 text-primary mb-0">{stats.pickupAM}</div>
                    <small>來程</small>
                </div>
                <div className="col-3 text-center">
                    <div className="h4 text-purple mb-0" style={{ color: '#9C27B0' }}>{stats.pickupPM}</div>
                    <small>回程</small>
                </div>
                <div className="col-3 text-center">
                    <div className="h4 text-warning mb-0">{stats.caregiverAM + stats.caregiverPM}</div>
                    <small>外勞接送</small>
                </div>
            </div>

            {/* 長者列表 */}
            <div className="card mb-3">
                <div className="card-header py-2">
                    <div className="row small text-center">
                        <div className="col-3 text-start">姓名</div>
                        <div className="col-1">出席</div>
                        <div className="col-1">來</div>
                        <div className="col-1">回</div>
                        <div className="col-2">外來</div>
                        <div className="col-2">外回</div>
                        <div className="col-2">外餐</div>
                    </div>
                </div>
                <ul className="list-group list-group-flush">
                    {elders.map((elder, index) => (
                        <li key={elder.id || index} className="list-group-item py-2" style={{ backgroundColor: elder.attended ? '#E8F5E9' : 'white' }}>
                            <div className="row align-items-center">
                                <div className="col-3"><strong>{elder.name}</strong></div>
                                <div className="col-1"><CheckBox checked={elder.attended} onChange={() => toggleAttended(index)} color="#4CAF50" /></div>
                                <div className="col-1"><CheckBox checked={elder.pickupAM} onChange={() => toggle(index, 'pickupAM')} disabled={!elder.attended} color="#2196F3" /></div>
                                <div className="col-1"><CheckBox checked={elder.pickupPM} onChange={() => toggle(index, 'pickupPM')} disabled={!elder.attended} color="#9C27B0" /></div>
                                <div className="col-2 text-center"><CheckBox checked={elder.caregiverAM} onChange={() => toggle(index, 'caregiverAM')} disabled={!elder.attended} color="#FF5722" /></div>
                                <div className="col-2 text-center"><CheckBox checked={elder.caregiverPM} onChange={() => toggle(index, 'caregiverPM')} disabled={!elder.attended} color="#E91E63" /></div>
                                <div className="col-2 text-center"><CheckBox checked={elder.caregiverLunch} onChange={() => toggle(index, 'caregiverLunch')} disabled={!elder.attended} color="#FF9800" /></div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 底部按鈕 */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px',
                backgroundColor: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                display: 'flex', gap: '10px'
            }}>
                <Link to="/fee-history" style={{
                    flex: 1, padding: '12px', backgroundColor: '#9E9E9E', color: 'white',
                    textAlign: 'center', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold'
                }}>取消</Link>
                <button onClick={handleSave} disabled={isSaving} style={{
                    flex: 2, padding: '12px', backgroundColor: isSaving ? '#BDBDBD' : '#4CAF50',
                    color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold'
                }}>{isSaving ? '儲存中...' : '✓ 儲存變更'}</button>
            </div>
        </div>
    );
}

export default FeeEdit;
