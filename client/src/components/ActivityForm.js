import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { addActivity } from '../utils/storage';

function ActivityForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 預設今天日期
    time: '', // 活動時間
    activityName: '', // 活動名稱
    purpose: '',
    topic: '',
    selectedPurposes: {}, // 勾選的活動目的
    participants: [],
    special: '',
    discussion: ''
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 長者名單相關 state
  const [elderList, setElderList] = useState([]);
  const [selectedElders, setSelectedElders] = useState({});
  const [isLoadingElders, setIsLoadingElders] = useState(true);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');

  // 活動主題相關 state
  const [topicList, setTopicList] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicPurposes, setNewTopicPurposes] = useState({});
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // 每週課表相關 state
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [suggestedTopic, setSuggestedTopic] = useState(null);

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

  // 載入長者名單
  useEffect(() => {
    const fetchElders = async () => {
      try {
        // 優先從 Google Sheets 讀取（多人同步）
        const response = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
        if (response.data && response.data.length > 0) {
          setElderList(response.data);
          setIsLoadingElders(false);
          return;
        }

        // 備用：從舊的 API 取得
        const fallbackResponse = await axios.get(`${API_BASE_URL}/api/elders`);
        setElderList(fallbackResponse.data);
      } catch (err) {
        console.error('載入長者名單失敗:', err);
        // 嘗試從 LocalStorage 讀取作為備用
        const savedElders = localStorage.getItem('settings_elders');
        if (savedElders) {
          const parsed = JSON.parse(savedElders);
          if (parsed.length > 0) {
            setElderList(parsed);
            setIsLoadingElders(false);
            return;
          }
        }
        setError('載入長者名單失敗，請確認 Google Sheets 設定');
      } finally {
        setIsLoadingElders(false);
      }
    };
    fetchElders();
  }, []);

  // 當日期或長者名單改變時，重新同步出席資料
  useEffect(() => {
    console.log('=== 開始同步出席資料 [v2.0 - 使用 elder ID] ===');
    console.log('目前日期:', formData.date);
    console.log('長者名單數量:', elderList.length);

    if (elderList.length === 0) {
      console.log('長者名單為空，跳過');
      return;
    }

    const storageKey = `fee_record_${formData.date}`;
    console.log('讀取 localStorage key:', storageKey);

    const feeRecord = localStorage.getItem(storageKey);
    console.log('localStorage 資料存在:', !!feeRecord);

    if (!feeRecord) {
      console.log('找不到出席資料，清空選擇');
      setSelectedElders({}); // 清空選擇
      return;
    }

    const data = JSON.parse(feeRecord);
    console.log('解析的資料:', data);

    const participants = data.participants || [];
    console.log('參與者數量:', participants.length);

    const attendedNames = participants.filter(p => p.attended).map(p => p.name);
    console.log('出席者名單:', attendedNames);

    // 使用 elder_${elder.id} 作為 key，與 UI 的 checkbox 對應
    const newSelectedElders = {};
    elderList.forEach(elder => {
      if (attendedNames.includes(elder.name)) {
        const elderKey = `elder_${elder.id}`;
        newSelectedElders[elderKey] = true;
      }
    });
    console.log('要選取的長者:', newSelectedElders);
    setSelectedElders(newSelectedElders);
  }, [formData.date, elderList]);


  // 載入活動主題列表
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
        setTopicList(response.data || []);
      } catch (err) {
        console.error('載入活動主題失敗:', err);
      } finally {
        setIsLoadingTopics(false);
      }
    };
    fetchTopics();
  }, []);

  // 載入每週課表
  useEffect(() => {
    const fetchSchedule = async () => {
      const today = new Date();
      const quarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;
      const key = `weekly_schedule_${quarter}`;

      // 先嘗試從 localStorage 讀取
      const cached = localStorage.getItem(key);
      if (cached) {
        setWeeklySchedule(JSON.parse(cached));
        return;
      }

      // 如果沒有快取，從 API 取得
      try {
        const response = await axios.get(`${API_BASE_URL}/api/sheets-schedule?quarter=${quarter}`);
        if (response.data.success && response.data.schedule) {
          const hasData = Object.values(response.data.schedule).some(day =>
            day.am.topic || day.pm.topic
          );
          if (hasData) {
            setWeeklySchedule(response.data.schedule);
            localStorage.setItem(key, JSON.stringify(response.data.schedule));
          }
        }
      } catch (err) {
        console.error('載入每週課表失敗:', err);
      }
    };
    fetchSchedule();
  }, []);

  // 根據日期和時段自動建議主題
  useEffect(() => {
    if (!weeklySchedule || !formData.date) return;

    const selectedDate = new Date(formData.date);
    const dayIndex = selectedDate.getDay(); // 0=Sunday, 1=Monday, ...
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayKeys[dayIndex];

    // 判斷時段：09:00-11:00 為上午, 13:30-15:30 為下午
    const period = formData.time === '09:00-11:00' ? 'am' : (formData.time === '13:30-15:30' ? 'pm' : null);

    if (weeklySchedule[dayKey] && period) {
      const scheduleItem = weeklySchedule[dayKey][period];
      if (scheduleItem && scheduleItem.topic) {
        setSuggestedTopic({
          topic: scheduleItem.topic,
          activityName: scheduleItem.activityName || '',
          dayName: ['日', '一', '二', '三', '四', '五', '六'][dayIndex],
          period: period === 'am' ? '上午' : '下午'
        });
      } else {
        setSuggestedTopic(null);
      }
    } else {
      setSuggestedTopic(null);
    }
  }, [formData.date, formData.time, weeklySchedule]);

  // 活動目的清單
  const [purposeList, setPurposeList] = useState([]);
  const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);

  // 載入活動目的列表
  useEffect(() => {
    const defaultPurposes = [
      { id: 'P1', name: '提升專注力' },
      { id: 'P2', name: '增進記憶力' },
      { id: 'P3', name: '促進社交互動' },
      { id: 'P4', name: '維持認知功能' },
      { id: 'P5', name: '情緒穩定' },
      { id: 'P6', name: '增進手眼協調' },
      { id: 'P7', name: '提升自我表達' },
      { id: 'P8', name: '增加生活參與' }
    ];

    const fetchPurposes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/sheets-purposes`);
        // 如果 API 回傳空陣列，使用預設清單
        if (response.data && response.data.length > 0) {
          setPurposeList(response.data);
        } else {
          setPurposeList(defaultPurposes);
        }
      } catch (err) {
        console.error('載入活動目的失敗:', err);
        setPurposeList(defaultPurposes);
      } finally {
        setIsLoadingPurposes(false);
      }
    };
    fetchPurposes();
  }, []);

  // 快速新增主題
  const handleQuickAddTopic = async () => {
    if (!newTopicName.trim()) {
      alert('請輸入主題名稱');
      return;
    }
    const selectedList = Object.keys(newTopicPurposes).filter(k => newTopicPurposes[k]);
    if (selectedList.length === 0) {
      alert('請至少選擇一個活動目的');
      return;
    }

    setIsAddingTopic(true);
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addTopic',
          name: newTopicName.trim(),
          purposes: selectedList.join(', ')
        })
      });

      alert('新增成功！');
      setShowTopicModal(false);
      setNewTopicName('');
      setNewTopicPurposes({});

      // 重新載入主題列表
      setTimeout(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
          setTopicList(response.data || []);
          // 自動選取新增的主題
          setFormData(prev => ({
            ...prev,
            topic: newTopicName.trim(),
            selectedPurposes: newTopicPurposes
          }));
        } catch (err) {
          console.error('重新載入主題失敗:', err);
        }
      }, 1500);
    } catch (err) {
      console.error('新增主題失敗:', err);
      alert('新增失敗，請稍後再試');
    } finally {
      setIsAddingTopic(false);
    }
  };

  // 刪除主題
  const handleDeleteTopic = async (topicName) => {
    if (!window.confirm(`確定要刪除「${topicName}」嗎？`)) return;

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTopic', name: topicName })
      });
      alert('刪除成功！');
      // 重新載入
      setTimeout(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
          setTopicList(response.data || []);
          if (formData.topic === topicName) {
            setFormData(prev => ({ ...prev, topic: '', selectedPurposes: {} }));
          }
        } catch (err) {
          console.error('重新載入主題失敗:', err);
        }
      }, 1500);
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...formData.participants];
    updatedParticipants[index] = { ...updatedParticipants[index], [field]: value };
    setFormData(prev => ({ ...prev, participants: updatedParticipants }));
  };

  // 根據能力分級取得預設評分
  const getDefaultScore = (level) => {
    switch (level) {
      case 'A': return 4; // 認知功能最佳，預設4分
      case 'B': return 3; // 尚可，預設3分
      case 'C': return 2; // 需較多協助，預設2分
      default: return 3;
    }
  };

  // 分級顏色對照
  const getLevelColor = (level) => {
    switch (level) {
      case 'A': return '#4CAF50'; // 綠色
      case 'B': return '#FF9800'; // 橘色
      case 'C': return '#f44336'; // 紅色
      default: return '#999';
    }
  };

  // 勾選/取消勾選長者
  const toggleElder = (elder) => {
    const elderKey = `elder_${elder.id}`;

    if (selectedElders[elderKey]) {
      // 取消勾選：移除該長者
      const newSelected = { ...selectedElders };
      delete newSelected[elderKey];
      setSelectedElders(newSelected);

      // 從 participants 中移除
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.elderId !== elder.id)
      }));
    } else {
      // 勾選：新增該長者，根據分級設定預設評分
      setSelectedElders(prev => ({
        ...prev,
        [elderKey]: true
      }));

      const defaultScore = getDefaultScore(elder.level);

      // 新增到 participants，含分級資訊
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          elderId: elder.id,
          name: elder.name,
          level: elder.level,
          levelDesc: elder.levelDesc,
          scoreRange: elder.scoreRange,
          focus: defaultScore,
          interaction: defaultScore,
          attention: defaultScore,
          participation: defaultScore,
          notes: ''
        }]
      }));
    }
  };

  // 全選所有長者
  const selectAllElders = () => {
    const newSelected = {};
    const newParticipants = [];

    elderList.forEach(elder => {
      const elderKey = `elder_${elder.id}`;
      // 只新增尚未選取的
      if (!selectedElders[elderKey]) {
        newSelected[elderKey] = true;
        const defaultScore = getDefaultScore(elder.level);
        newParticipants.push({
          elderId: elder.id,
          name: elder.name,
          level: elder.level,
          levelDesc: elder.levelDesc,
          scoreRange: elder.scoreRange,
          focus: defaultScore,
          interaction: defaultScore,
          attention: defaultScore,
          participation: defaultScore,
          notes: ''
        });
      } else {
        newSelected[elderKey] = true;
      }
    });

    setSelectedElders(prev => ({ ...prev, ...newSelected }));
    setFormData(prev => ({
      ...prev,
      participants: [
        ...prev.participants.filter(p => p.elderId), // 保留已有的（保持評分）
        ...newParticipants // 新增沒選過的
      ]
    }));
  };

  // 取消全選
  const deselectAllElders = () => {
    // 只移除從名單選的，保留手動新增的
    setSelectedElders({});
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.isManual)
    }));
  };

  // 手動新增參與者（非名單上的人）
  const addManualParticipant = () => {
    if (!manualName.trim()) return;

    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, {
        name: manualName.trim(),
        focus: 3,
        interaction: 3,
        attention: 3,
        notes: '',
        isManual: true
      }]
    }));
    setManualName('');
    setShowManualAdd(false);
  };

  // 移除參與者
  const removeParticipant = (index) => {
    const participant = formData.participants[index];

    // 如果是從名單勾選的，同時取消勾選狀態
    if (participant.elderId) {
      const elderKey = `elder_${participant.elderId}`;
      const newSelected = { ...selectedElders };
      delete newSelected[elderKey];
      setSelectedElders(newSelected);
    }

    const updatedParticipants = formData.participants.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, participants: updatedParticipants }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);

    // 檢查檔案數量限制
    if (photos.length + files.length > 4) {
      setError('最多只能上傳4張照片');
      return;
    }

    // 檢查檔案大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) {
        setError('單一檔案大小不能超過5MB');
        return;
      }
    }

    // 檢查檔案類型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError('只允許上傳 JPEG、PNG、GIF 或 WebP 格式的圖片');
        return;
      }
    }

    // 更新照片檔案
    setPhotos(prev => [...prev, ...files]);

    // 生成預覽圖
    const newPreviews = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          file,
          url: e.target.result
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPreviews).then(previews => {
      setPhotoPreviews(prev => [...prev, ...previews]);
    });

    // 清空錯誤訊息
    setError('');
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // 驗證參與者資料
    if (formData.participants.some(p => !p.name.trim())) {
      setError('請填寫所有參與者的姓名');
      setIsSubmitting(false);
      return;
    }

    try {
      // Google Apps Script 網址
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

      // 將勾選的目的轉成字串
      const selectedPurposeList = Object.keys(formData.selectedPurposes || {})
        .filter(key => formData.selectedPurposes[key])
        .join(', ');

      // 準備要寫入 Google Sheets 的資料
      const participantNames = formData.participants.map(p => p.name).join(', ');
      const participantDetails = formData.participants.map(p =>
        `${p.name}(專注:${p.focus},互動:${p.interaction},注意:${p.attention},參與:${p.participation || 3}${p.notes ? ',備註:' + p.notes : ''})`
      ).join('; ');

      const sheetData = {
        date: formData.date,
        time: formData.time,
        activityName: formData.activityName,
        purpose: selectedPurposeList,
        topic: formData.topic,
        participants: participantDetails,
        special: formData.special || '',
        discussion: formData.discussion || ''
      };

      // 寫入 Google Sheets
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sheetData)
      });

      // 同時也儲存到 LocalStorage 作為備份和快速讀取
      addActivity({
        ...formData,
        photos: photoPreviews.map(p => p.url)
      });

      const successMessage = `活動紀錄新增成功！\n參與者: ${formData.participants.length} 位\n已同步到 Google Sheets`;
      alert(successMessage);
      navigate('/activities');

    } catch (error) {
      console.error('提交錯誤:', error);
      // 即使 Google Sheets 失敗，也儲存到本地
      addActivity({
        ...formData,
        photos: photoPreviews.map(p => p.url)
      });
      alert('活動紀錄已儲存到本地（Google Sheets 同步可能延遲）');
      navigate('/activities');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header">
            <h3 className="mb-0">新增活動紀錄</h3>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="activity-form">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label htmlFor="date" className="form-label">活動日期 *</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">活動時間 *</label>
                  <div className="d-flex gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="time"
                        id="time-morning"
                        value="09:00-11:00"
                        checked={formData.time === '09:00-11:00'}
                        onChange={handleChange}
                        required
                      />
                      <label className="form-check-label" htmlFor="time-morning">
                        09:00-11:00
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="time"
                        id="time-afternoon"
                        value="13:30-15:30"
                        checked={formData.time === '13:30-15:30'}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="time-afternoon">
                        13:30-15:30
                      </label>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="activityName" className="form-label">活動名稱 *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="activityName"
                    name="activityName"
                    value={formData.activityName}
                    onChange={handleChange}
                    placeholder="例：認知訓練課程、懷舊音樂會..."
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 mb-3">
                  {/* 建議主題提示區塊 */}
                  {suggestedTopic && (
                    <div
                      className="alert alert-info d-flex justify-content-between align-items-center mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        border: '2px solid #2196F3',
                        borderRadius: '12px'
                      }}
                    >
                      <div>
                        <strong>📅 週{suggestedTopic.dayName} {suggestedTopic.period} 建議主題：</strong>
                        <span className="ms-2" style={{ fontSize: '1.1rem', color: '#1565c0' }}>
                          {suggestedTopic.topic}
                        </span>
                        {suggestedTopic.activityName && (
                          <small className="d-block text-muted mt-1">
                            活動名稱：{suggestedTopic.activityName}
                          </small>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          // 套用建議主題
                          const matchedTopic = topicList.find(t => t.name === suggestedTopic.topic);
                          const purposes = matchedTopic?.relatedPurposes || [];
                          const purposeObj = {};
                          purposes.forEach(p => { purposeObj[p] = true; });

                          setFormData(prev => ({
                            ...prev,
                            topic: suggestedTopic.topic,
                            activityName: suggestedTopic.activityName || prev.activityName,
                            selectedPurposes: purposeObj
                          }));
                        }}
                        style={{
                          borderRadius: '20px',
                          padding: '8px 16px',
                          fontWeight: 'bold'
                        }}
                      >
                        ✓ 套用建議
                      </button>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label htmlFor="topic" className="form-label mb-0">活動主題 *</label>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setShowTopicModal(true)}
                    >
                      ➕ 新增主題
                    </button>
                  </div>
                  {isLoadingTopics ? (
                    <div className="text-muted">載入中...</div>
                  ) : (
                    <>
                      <select
                        className="form-select"
                        id="topic"
                        name="topic"
                        value={formData.topic}
                        onChange={(e) => {
                          const selectedTopic = topicList.find(t => t.name === e.target.value);
                          const purposes = selectedTopic?.relatedPurposes || [];
                          // 自動勾選對應的目的
                          const purposeObj = {};
                          purposes.forEach(p => { purposeObj[p] = true; });
                          setFormData(prev => ({
                            ...prev,
                            topic: e.target.value,
                            selectedPurposes: purposeObj
                          }));
                        }}
                        required
                      >
                        <option value="">-- 請選擇活動主題 --</option>
                        {topicList.map((topic, i) => (
                          <option key={i} value={topic.name}>{topic.name}</option>
                        ))}
                      </select>
                      {/* 現有主題快覽（可刪除） */}
                      {topicList.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted d-block mb-1">現有主題（點擊 ✕ 刪除）：</small>
                          <div className="d-flex flex-wrap gap-1">
                            {topicList.map((t, i) => (
                              <span key={i} className="badge bg-light text-dark border" style={{ fontSize: '0.8rem' }}>
                                {t.name}
                                <button
                                  type="button"
                                  className="btn-close ms-1"
                                  style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}
                                  onClick={() => handleDeleteTopic(t.name)}
                                  title="刪除此主題"
                                />
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 活動目的勾選區 - 獨立選擇 */}
              <div className="mb-4">
                <label className="form-label">
                  <i className="fas fa-bullseye me-2"></i>
                  活動目的 *（點擊選取，建議選 2-3 個）
                </label>
                {isLoadingPurposes ? (
                  <div className="text-muted">載入中...</div>
                ) : (
                  <div className="border rounded p-3 bg-light">
                    <div className="d-flex flex-wrap gap-2">
                      {purposeList.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`btn btn-sm ${formData.selectedPurposes?.[p.name] ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              selectedPurposes: {
                                ...prev.selectedPurposes,
                                [p.name]: !prev.selectedPurposes?.[p.name]
                              }
                            }));
                          }}
                          style={{
                            transition: 'all 0.2s',
                            borderRadius: '20px',
                            fontWeight: formData.selectedPurposes?.[p.name] ? '600' : '400'
                          }}
                        >
                          {formData.selectedPurposes?.[p.name] ? '✓ ' : ''}{p.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-top">
                      <small className={`${Object.values(formData.selectedPurposes || {}).filter(v => v).length === 0 ? 'text-danger' : 'text-success'}`}>
                        已選擇 {Object.values(formData.selectedPurposes || {}).filter(v => v).length} 個目的
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {/* 長者勾選區域 */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    <i className="fas fa-users me-2"></i>
                    選擇今日參與的長者
                  </label>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={selectAllElders}
                    >
                      ✓ 全選
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={deselectAllElders}
                    >
                      ✗ 取消全選
                    </button>
                  </div>
                </div>

                {isLoadingElders ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">載入中...</span>
                    </div>
                    <p className="mt-2 text-muted">載入長者名單中...</p>
                  </div>
                ) : (
                  <div className="border rounded p-3 bg-light">
                    <div className="row">
                      {elderList.map((elder) => (
                        <div key={elder.id} className="col-md-4 col-sm-6 mb-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`elder_${elder.id}`}
                              checked={!!selectedElders[`elder_${elder.id}`]}
                              onChange={() => toggleElder(elder)}
                            />
                            <label
                              className="form-check-label d-flex align-items-center"
                              htmlFor={`elder_${elder.id}`}
                              style={{ cursor: 'pointer' }}
                            >
                              {elder.name}
                              {elder.level && (
                                <span
                                  className="badge ms-1"
                                  style={{
                                    backgroundColor: getLevelColor(elder.level),
                                    fontSize: '10px',
                                    padding: '2px 5px'
                                  }}
                                >
                                  {elder.level}
                                </span>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 手動新增區域 */}
                    <div className="mt-3 pt-3 border-top">
                      {showManualAdd ? (
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="輸入姓名"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addManualParticipant()}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={addManualParticipant}
                          >
                            確定
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setShowManualAdd(false); setManualName(''); }}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setShowManualAdd(true)}
                        >
                          <i className="fas fa-plus me-1"></i>
                          新增其他參與者
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <small className="text-muted d-block mt-2">
                  已選擇 {formData.participants.length} 位參與者
                </small>
              </div>

              {/* 已選參與者評分區域 */}
              {formData.participants.length > 0 && (
                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-star me-2"></i>
                    參與者表現評分
                  </label>

                  {formData.participants.map((participant, index) => (
                    <div key={index} className="border rounded p-3 mb-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0 text-primary">
                          <i className="fas fa-user me-2"></i>
                          {participant.name}
                          {participant.level && (
                            <span
                              className="badge ms-2"
                              style={{ backgroundColor: getLevelColor(participant.level) }}
                            >
                              {participant.level} - {participant.levelDesc}
                            </span>
                          )}
                          {participant.isManual && (
                            <span className="badge bg-secondary ms-2">手動新增</span>
                          )}
                        </h6>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeParticipant(index)}
                        >
                          <i className="fas fa-times me-1"></i>
                          移除
                        </button>
                      </div>
                      {/* 建議評分範圍提示 - 列印時隱藏 */}
                      {participant.scoreRange && (
                        <div className="mb-2 no-print" style={{ fontSize: '12px', color: '#666', backgroundColor: '#f8f9fa', padding: '5px 10px', borderRadius: '4px' }}>
                          💡 <strong>系統建議：</strong>依據分級，建議評分範圍 {participant.scoreRange.min}-{participant.scoreRange.max} 分
                        </div>
                      )}

                      <div className="row">
                        <div className="col-md-3">
                          <label className="form-label small">專注力</label>
                          <select
                            className="form-select form-select-sm"
                            value={participant.focus}
                            onChange={(e) => handleParticipantChange(index, 'focus', parseInt(e.target.value))}
                          >
                            <option value={1}>1 - 很差</option>
                            <option value={2}>2 - 差</option>
                            <option value={3}>3 - 普通</option>
                            <option value={4}>4 - 好</option>
                            <option value={5}>5 - 很好</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small">人際互動</label>
                          <select
                            className="form-select form-select-sm"
                            value={participant.interaction}
                            onChange={(e) => handleParticipantChange(index, 'interaction', parseInt(e.target.value))}
                          >
                            <option value={1}>1 - 很差</option>
                            <option value={2}>2 - 差</option>
                            <option value={3}>3 - 普通</option>
                            <option value={4}>4 - 好</option>
                            <option value={5}>5 - 很好</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">注意力</label>
                          <select
                            className="form-select form-select-sm"
                            value={participant.attention}
                            onChange={(e) => handleParticipantChange(index, 'attention', parseInt(e.target.value))}
                          >
                            <option value={1}>1 - 很差</option>
                            <option value={2}>2 - 差</option>
                            <option value={3}>3 - 普通</option>
                            <option value={4}>4 - 好</option>
                            <option value={5}>5 - 很好</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">參與程度</label>
                          <select
                            className="form-select form-select-sm"
                            value={participant.participation || 3}
                            onChange={(e) => handleParticipantChange(index, 'participation', parseInt(e.target.value))}
                          >
                            <option value={1}>1 - 很差</option>
                            <option value={2}>2 - 差</option>
                            <option value={3}>3 - 普通</option>
                            <option value={4}>4 - 好</option>
                            <option value={5}>5 - 很好</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">備註</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={participant.notes}
                            onChange={(e) => handleParticipantChange(index, 'notes', e.target.value)}
                            placeholder="備註"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 照片上傳區域 */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    <i className="fas fa-camera me-2"></i>
                    活動照片（最多4張）
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    id="photo-upload"
                    max="4"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="btn btn-outline-primary btn-sm"
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="fas fa-plus me-1"></i>
                    選擇照片
                  </label>
                </div>

                {/* 照片預覽區域 */}
                {photoPreviews.length > 0 && (
                  <div className="row">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="col-md-3 col-sm-6 mb-3">
                        <div className="position-relative">
                          <img
                            src={preview.url}
                            alt={`預覽 ${index + 1}`}
                            className="img-fluid rounded border"
                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                            onClick={() => removePhoto(index)}
                            style={{ padding: '2px 8px' }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                        <small className="text-muted d-block mt-1">
                          {preview.file.name}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                <small className="text-muted">
                  支援 JPEG、PNG、GIF、WebP 格式，單一檔案最大 5MB
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="special" className="form-label">特殊狀況</label>
                <textarea
                  className="form-control"
                  id="special"
                  name="special"
                  rows="3"
                  value={formData.special}
                  onChange={handleChange}
                  placeholder="記錄特殊事件或觀察..."
                />
              </div>

              <div className="mb-3">
                <label htmlFor="discussion" className="form-label">活動後續討論</label>
                <textarea
                  className="form-control"
                  id="discussion"
                  name="discussion"
                  rows="3"
                  value={formData.discussion}
                  onChange={handleChange}
                  placeholder="記錄活動後的討論內容..."
                />
              </div>

              <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/')}
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : '新增活動紀錄'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 新增主題 Modal */}
      {showTopicModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">➕ 快速新增活動主題</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowTopicModal(false);
                    setNewTopicName('');
                    setNewTopicPurposes({});
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">主題名稱 *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="例：認知促進、懷舊治療..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">對應活動目的 *（點擊選取）</label>
                  <div className="border rounded p-3 bg-light">
                    <div className="d-flex flex-wrap gap-2">
                      {purposeList.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`btn btn-sm ${newTopicPurposes[p.name] ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => {
                            setNewTopicPurposes(prev => ({
                              ...prev,
                              [p.name]: !prev[p.name]
                            }));
                          }}
                          style={{ borderRadius: '20px' }}
                        >
                          {newTopicPurposes[p.name] ? '✓ ' : ''}{p.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-top">
                      <small className="text-muted">
                        已選擇 {Object.values(newTopicPurposes).filter(v => v).length} 個目的
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowTopicModal(false);
                    setNewTopicName('');
                    setNewTopicPurposes({});
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleQuickAddTopic}
                  disabled={isAddingTopic}
                >
                  {isAddingTopic ? '新增中...' : '✓ 新增主題'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityForm;