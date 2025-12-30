import React from 'react';

/**
 * ValidatedInput - 帶驗證的輸入元件
 * 
 * 提供即時驗證和視覺回饋
 * 
 * @param {string} type - 輸入類型：'bloodPressure' | 'temperature' | 'number'
 * @param {string} value - 當前值
 * @param {function} onChange - 值變更事件
 * @param {string} placeholder - 占位符
 * @param {object} validation - 驗證規則 { min, max }
 * @param {boolean} showStatus - 是否顯示狀態標籤
 * @param {string} label - 欄位標籤
 */

// 血壓狀態判定
const getBPStatus = (systolic, diastolic) => {
    const s = parseInt(systolic);
    const d = parseInt(diastolic);
    if (!s || !d) return null;
    if (s < 90 || d < 60) return { text: '偏低', color: '#2196F3', bg: '#e3f2fd' };
    if (s <= 120 && d <= 80) return { text: '正常', color: '#4CAF50', bg: '#e8f5e9' };
    if (s <= 139 && d <= 89) return { text: '偏高', color: '#FF9800', bg: '#fff3e0' };
    return { text: '高血壓', color: '#f44336', bg: '#ffebee' };
};

// 體溫狀態判定
const getTempStatus = (temp) => {
    const t = parseFloat(temp);
    if (!t) return null;
    if (t < 35) return { text: '偏低', color: '#2196F3', bg: '#e3f2fd' };
    if (t < 36) return { text: '稍低', color: '#03A9F4', bg: '#e1f5fe' };
    if (t <= 37.4) return { text: '正常', color: '#4CAF50', bg: '#e8f5e9' };
    if (t <= 38) return { text: '微燒', color: '#FF9800', bg: '#fff3e0' };
    return { text: '發燒', color: '#f44336', bg: '#ffebee' };
};

// 驗證數值範圍
const validateRange = (value, min, max) => {
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: true, message: '' };
    if (num < min) return { valid: false, message: `最小值 ${min}` };
    if (num > max) return { valid: false, message: `最大值 ${max}` };
    return { valid: true, message: '' };
};

// 血壓輸入元件
export function BloodPressureInput({
    systolic,
    diastolic,
    onSystolicChange,
    onDiastolicChange,
    showStatus = true
}) {
    const status = getBPStatus(systolic, diastolic);
    const sysValidation = validateRange(systolic, 60, 220);
    const diaValidation = validateRange(diastolic, 40, 140);

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={systolic}
                    onChange={(e) => onSystolicChange(e.target.value)}
                    placeholder="收縮壓"
                    min="60"
                    max="220"
                    style={{
                        width: '70px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: `2px solid ${!sysValidation.valid ? '#f44336' : status ? status.color : '#ddd'}`,
                        textAlign: 'center',
                        fontSize: '1rem',
                        backgroundColor: status ? status.bg : 'white',
                        transition: 'all 0.2s'
                    }}
                />
                <span style={{ color: '#666' }}>/</span>
                <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={diastolic}
                    onChange={(e) => onDiastolicChange(e.target.value)}
                    placeholder="舒張壓"
                    min="40"
                    max="140"
                    style={{
                        width: '70px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: `2px solid ${!diaValidation.valid ? '#f44336' : status ? status.color : '#ddd'}`,
                        textAlign: 'center',
                        fontSize: '1rem',
                        backgroundColor: status ? status.bg : 'white',
                        transition: 'all 0.2s'
                    }}
                />
                {showStatus && status && (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: status.color,
                        whiteSpace: 'nowrap'
                    }}>
                        {status.text}
                    </span>
                )}
            </div>
            {(!sysValidation.valid || !diaValidation.valid) && (
                <div style={{
                    color: '#f44336',
                    fontSize: '0.75rem',
                    marginTop: '4px'
                }}>
                    {!sysValidation.valid && `收縮壓${sysValidation.message} `}
                    {!diaValidation.valid && `舒張壓${diaValidation.message}`}
                </div>
            )}
        </div>
    );
}

// 體溫輸入元件
export function TemperatureInput({
    value,
    onChange,
    showStatus = true
}) {
    const status = getTempStatus(value);
    const validation = validateRange(value, 34, 42);

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="體溫"
                    min="34"
                    max="42"
                    style={{
                        width: '80px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: `2px solid ${!validation.valid ? '#f44336' : status ? status.color : '#ddd'}`,
                        textAlign: 'center',
                        fontSize: '1rem',
                        backgroundColor: status ? status.bg : 'white',
                        transition: 'all 0.2s'
                    }}
                />
                <span style={{ color: '#666' }}>°C</span>
                {showStatus && status && (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: status.color,
                        whiteSpace: 'nowrap'
                    }}>
                        {status.text}
                    </span>
                )}
            </div>
            {!validation.valid && (
                <div style={{
                    color: '#f44336',
                    fontSize: '0.75rem',
                    marginTop: '4px'
                }}>
                    體溫{validation.message}
                </div>
            )}
        </div>
    );
}

// 通用驗證輸入元件
export function ValidatedInput({
    type = 'text',
    value,
    onChange,
    placeholder = '',
    min,
    max,
    required = false,
    label = '',
    suffix = '',
    width = '100%'
}) {
    const validation = (min !== undefined || max !== undefined)
        ? validateRange(value, min, max)
        : { valid: true, message: '' };

    const isEmpty = required && !value;
    const hasError = !validation.valid || isEmpty;

    return (
        <div style={{ width }}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '0.9rem',
                    color: '#555',
                    fontWeight: '500'
                }}>
                    {label} {required && <span style={{ color: '#f44336' }}>*</span>}
                </label>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `2px solid ${hasError && value ? '#f44336' : '#ddd'}`,
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                    }}
                />
                {suffix && <span style={{ color: '#666' }}>{suffix}</span>}
            </div>
            {hasError && value && (
                <div style={{
                    color: '#f44336',
                    fontSize: '0.75rem',
                    marginTop: '4px'
                }}>
                    {validation.message}
                </div>
            )}
        </div>
    );
}

export default { BloodPressureInput, TemperatureInput, ValidatedInput };
