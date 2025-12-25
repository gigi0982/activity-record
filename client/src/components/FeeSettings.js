import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function FeeSettings() {
    // 便當店設定
    const [stores, setStores] = useState([]);
    const [newStore, setNewStore] = useState({ name: '', price: 70, note: '' });

    // 費率設定
    const [rates, setRates] = useState({
        elderTransport: 90,     // 長者接送
        elderMeal: 70,          // 長者餐費
        caregiverTransport: 100, // 外勞接送
        caregiverMeal: 100,     // 外勞餐費
    });

    // 載入設定
    useEffect(() => {
        const savedStores = localStorage.getItem('lunchbox_stores');
        if (savedStores) {
            setStores(JSON.parse(savedStores));
        } else {
            setStores([
                { id: 1, name: '福來便當', price: 70, note: '葷食' },
                { id: 2, name: '阿嬤廚房', price: 65, note: '素食' },
            ]);
        }

        const savedRates = localStorage.getItem('transport_rates');
        if (savedRates) {
            setRates({ ...rates, ...JSON.parse(savedRates) });
        }
    }, []);

    // 儲存便當店
    const saveStores = (newStores) => {
        localStorage.setItem('lunchbox_stores', JSON.stringify(newStores));
        setStores(newStores);
    };

    // 新增便當店
    const addStore = () => {
        if (!newStore.name.trim()) {
            alert('請輸入便當店名稱');
            return;
        }
        const store = {
            id: Date.now(),
            name: newStore.name.trim(),
            price: parseInt(newStore.price) || 70,
            note: newStore.note.trim(),
        };
        saveStores([...stores, store]);
        setNewStore({ name: '', price: 70, note: '' });
    };

    // 更新便當店
    const updateStore = (id, field, value) => {
        saveStores(stores.map(s =>
            s.id === id ? { ...s, [field]: field === 'price' ? parseInt(value) || 0 : value } : s
        ));
    };

    // 刪除便當店
    const deleteStore = (id) => {
        if (!window.confirm('確定要刪除這家便當店嗎？')) return;
        saveStores(stores.filter(s => s.id !== id));
    };

    // 儲存費率
    const saveRates = () => {
        localStorage.setItem('transport_rates', JSON.stringify(rates));
        alert('費率設定已儲存！');
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-cog me-2"></i>收費設定</h2>
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>

            {/* 費率設定 */}
            <div className="card mb-4">
                <div className="card-header bg-success text-white">
                    <i className="fas fa-dollar-sign me-2"></i>費率設定
                </div>
                <div className="card-body">
                    <h6 className="mb-3">👵 長者費率</h6>
                    <div className="row mb-4">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">接送費（每人每趟）</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={rates.elderTransport}
                                    onChange={(e) => setRates({ ...rates, elderTransport: parseInt(e.target.value) || 0 })}
                                />
                                <span className="input-group-text">元</span>
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">餐費（每人每次）</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={rates.elderMeal}
                                    onChange={(e) => setRates({ ...rates, elderMeal: parseInt(e.target.value) || 0 })}
                                />
                                <span className="input-group-text">元</span>
                            </div>
                        </div>
                    </div>

                    <h6 className="mb-3">👷 外勞/自費費率</h6>
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">接送費（每人每趟）</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={rates.caregiverTransport}
                                    onChange={(e) => setRates({ ...rates, caregiverTransport: parseInt(e.target.value) || 0 })}
                                />
                                <span className="input-group-text">元</span>
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">餐費（每人每次）</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={rates.caregiverMeal}
                                    onChange={(e) => setRates({ ...rates, caregiverMeal: parseInt(e.target.value) || 0 })}
                                />
                                <span className="input-group-text">元</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-success" onClick={saveRates}>
                        <i className="fas fa-save me-1"></i>儲存費率
                    </button>
                </div>
            </div>

            {/* 便當店管理 */}
            <div className="card mb-4">
                <div className="card-header bg-warning d-flex justify-content-between align-items-center">
                    <span><i className="fas fa-utensils me-2"></i>便當店管理</span>
                    <span className="badge bg-dark">{stores.length} 家</span>
                </div>
                <div className="card-body">
                    {/* 新增便當店 */}
                    <div className="row mb-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label">店名 *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="例：福來便當"
                                value={newStore.name}
                                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">單價</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={newStore.price}
                                    onChange={(e) => setNewStore({ ...newStore, price: e.target.value })}
                                />
                                <span className="input-group-text">元</span>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">備註</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="例：素食"
                                value={newStore.note}
                                onChange={(e) => setNewStore({ ...newStore, note: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-primary w-100" onClick={addStore}>
                                <i className="fas fa-plus me-1"></i>新增
                            </button>
                        </div>
                    </div>

                    {/* 便當店列表 */}
                    {stores.length === 0 ? (
                        <p className="text-muted text-center">尚無便當店，請新增</p>
                    ) : (
                        <table className="table table-sm table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>店名</th>
                                    <th>單價</th>
                                    <th>備註</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stores.map(store => (
                                    <tr key={store.id}>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={store.name}
                                                onChange={(e) => updateStore(store.id, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <div className="input-group input-group-sm" style={{ width: '120px' }}>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={store.price}
                                                    onChange={(e) => updateStore(store.id, 'price', e.target.value)}
                                                />
                                                <span className="input-group-text">元</span>
                                            </div>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={store.note}
                                                onChange={(e) => updateStore(store.id, 'note', e.target.value)}
                                                placeholder="備註"
                                            />
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteStore(store.id)}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
        </div>
    );
}

export default FeeSettings;
