import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function ActivityForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 預設今天日期
    purpose: '',
    topic: '',
    participants: [{ name: '', focus: 3, interaction: 3, attention: 3, notes: '' }],
    special: '',
    discussion: ''
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', focus: 3, interaction: 3, attention: 3, notes: '' }]
    }));
  };

  const removeParticipant = (index) => {
    if (formData.participants.length > 1) {
      const updatedParticipants = formData.participants.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, participants: updatedParticipants }));
    }
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
      // 使用 FormData 支援照片上傳
      const formDataToSend = new FormData();
      
      // 添加活動資料
      formDataToSend.append('data', JSON.stringify(formData));
      
      // 添加照片檔案
      photos.forEach((photo) => {
        formDataToSend.append('photos', photo);
      });

      const response = await axios.post(`${API_BASE_URL}/api/activity`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const successMessage = `活動紀錄新增成功！\n參與者: ${response.data.participantCount} 位${response.data.photoCount ? `\n照片: ${response.data.photoCount} 張已上傳` : ''}`;
        alert(successMessage);
        navigate('/');
      } else {
        setError('新增失敗，請稍後再試');
      }
    } catch (error) {
      console.error('提交錯誤:', error);
      setError(error.response?.data?.error || '新增失敗，請稍後再試');
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
                <div className="col-md-6 mb-3">
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
                <div className="col-md-6 mb-3">
                  <label htmlFor="purpose" className="form-label">活動目的 *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    placeholder="例：提升認知功能、促進社交互動..."
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="topic" className="form-label">活動主題 *</label>
                <input
                  type="text"
                  className="form-control"
                  id="topic"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  placeholder="例：懷舊歌曲欣賞、手工藝製作..."
                  required
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    <i className="fas fa-users me-2"></i>
                    參與者及表現評分
                  </label>
                  <button 
                    type="button" 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={addParticipant}
                  >
                    <i className="fas fa-user-plus me-1"></i>
                    新增參與者
                  </button>
                </div>
                
                {formData.participants.map((participant, index) => (
                  <div key={index} className="border rounded p-3 mb-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0 text-primary">
                        <i className="fas fa-user me-2"></i>
                        參與者 {index + 1}
                      </h6>
                      {formData.participants.length > 1 && (
                        <button 
                          type="button" 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeParticipant(index)}
                        >
                          <i className="fas fa-times me-1"></i>
                          移除
                        </button>
                      )}
                    </div>
                    
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <label className="form-label">姓名</label>
                        <input
                          type="text"
                          className="form-control"
                          value={participant.name}
                          onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                          placeholder="參與者姓名"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">個人備註</label>
                        <input
                          type="text"
                          className="form-control"
                          value={participant.notes}
                          onChange={(e) => handleParticipantChange(index, 'notes', e.target.value)}
                          placeholder="特別表現或需要注意的事項"
                        />
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-4">
                        <label className="form-label">專注力 (1-5分)</label>
                        <select
                          className="form-select"
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
                      <div className="col-md-4">
                        <label className="form-label">人際互動 (1-5分)</label>
                        <select
                          className="form-select"
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
                      <div className="col-md-4">
                        <label className="form-label">注意力 (1-5分)</label>
                        <select
                          className="form-select"
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
                    </div>
                  </div>
                ))}
              </div>

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
    </div>
  );
}

export default ActivityForm;