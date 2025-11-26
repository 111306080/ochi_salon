import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { portfolioAPI, designerAPI, authAPI } from '../../services/api';

// --- 型別定義 ---
interface PortfolioItem {
  portfolio_id: number;
  image_url: string;
  description: string;
  style_tag: string;
  created_at: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  photo_url: string;
  style_description: string;
}

const Portfolio: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // --- 個人資料 State ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', style_description: '' });

  // --- 作品集 State ---
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [uploadWorkFile, setUploadWorkFile] = useState<File | null>(null);
  const [workDescription, setWorkDescription] = useState('');
  const [workStyleTag, setWorkStyleTag] = useState('韓系');
  const [isUploadingWork, setIsUploadingWork] = useState(false);

  // --- 初始化載入 ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // 同時載入個人資料和作品集
      const [userData, portfolioData] = await Promise.all([
        authAPI.getCurrentUser(),
        portfolioAPI.getMyPortfolio()
      ]);

      // 設定個人資料
      setProfile(userData);
      setProfileForm({
        name: userData.name,
        phone: userData.phone,
        style_description: userData.style_description || ''
      });

      // 設定作品集
      setPortfolioItems(portfolioData.portfolios || []);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 個人資料處理函式 ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const res = await designerAPI.uploadAvatar(file);
        setProfile(prev => prev ? { ...prev, photo_url: res.photo_url } : null);
        alert('大頭貼更新成功！');
      } catch (error) {
        alert('大頭貼上傳失敗');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await designerAPI.updateProfile(profileForm);
      setProfile(prev => prev ? { ...prev, ...profileForm } : null);
      setIsEditingProfile(false);
      alert('資料更新成功');
    } catch (error) {
      alert('更新失敗');
    }
  };

  // --- 作品集處理函式 ---
  const handleWorkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadWorkFile(e.target.files[0]);
  };

  const handleUploadWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadWorkFile) return alert('請選擇圖片');

    try {
      setIsUploadingWork(true);
      await portfolioAPI.upload(uploadWorkFile, workDescription, workStyleTag);
      alert('作品上傳成功！');
      setIsPortfolioModalOpen(false);
      
      // 重置表單
      setUploadWorkFile(null);
      setWorkDescription('');
      setWorkStyleTag('韓系');
      
      // 重新整理列表
      const data = await portfolioAPI.getMyPortfolio();
      setPortfolioItems(data.portfolios || []);
    } catch (error) {
      alert('上傳失敗');
    } finally {
      setIsUploadingWork(false);
    }
  };

  const handleDeleteWork = async (id: number) => {
    if (!window.confirm('確定刪除此作品？')) return;
    try {
      await portfolioAPI.delete(id);
      setPortfolioItems(prev => prev.filter(item => item.portfolio_id !== id));
    } catch (error) {
      alert('刪除失敗');
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">載入中...</div>;
  if (!profile) return <div className="p-10 text-center">無法載入資料</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      
      {/* 區塊一：個人資料管理 */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">個人資料管理</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左側：大頭貼 */}
          <div className="md:col-span-1">
            <Card className="text-center p-6 h-full flex flex-col justify-center items-center">
              <div className="relative inline-block group">
                <img 
                  src={profile.photo_url || "https://via.placeholder.com/150?text=Avatar"} 
                  alt="Avatar" 
                  className="w-40 h-40 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                />
                <label className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
              <h2 className="mt-4 font-bold text-xl text-gray-800">{profile.name}</h2>
              <p className="text-gray-500">專業設計師</p>
            </Card>
          </div>

          {/* 右側：基本資料編輯 */}
          <div className="md:col-span-2">
            <Card className="p-6 h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">基本資訊</h3>
                {!isEditingProfile && (
                  <Button variant="outline" size="small" onClick={() => setIsEditingProfile(true)}>
                    編輯資料
                  </Button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                      <input 
                        type="text" className="w-full px-3 py-2 border rounded-md"
                        value={profileForm.name}
                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">手機</label>
                      <input 
                        type="text" className="w-full px-3 py-2 border rounded-md"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">個人風格簡介</label>
                    <textarea 
                      className="w-full px-3 py-2 border rounded-md"
                      rows={4}
                      value={profileForm.style_description}
                      onChange={e => setProfileForm({...profileForm, style_description: e.target.value})}
                      placeholder="介紹您的專長與風格..."
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button type="button" variant="secondary" onClick={() => setIsEditingProfile(false)}>取消</Button>
                    <Button type="submit">儲存變更</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Email</label>
                      <p className="text-gray-900 mt-1 font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">手機</label>
                      <p className="text-gray-900 mt-1 font-medium">{profile.phone}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">個人風格簡介</label>
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {profile.style_description || "尚未填寫簡介，請點擊編輯新增..."}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* 區塊二：作品集管理 */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的作品集</h2>
            <p className="text-gray-500 mt-1">上傳最新髮型作品，展現您的專業風格</p>
          </div>
          <Button onClick={() => setIsPortfolioModalOpen(true)}>
            + 上傳新作品
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">目前還沒有作品，趕快上傳第一張吧！</p>
            </div>
          ) : (
            portfolioItems.map((item) => (
              <Card key={item.portfolio_id} className="group overflow-hidden">
                <div className="relative aspect-w-3 aspect-h-4 bg-gray-100">
                  <img 
                    src={item.image_url} 
                    alt={item.description}
                    className="object-cover w-full h-64 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                      {item.style_tag}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-900 font-medium truncate mb-2">{item.description || '無描述'}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    <button 
                      onClick={() => handleDeleteWork(item.portfolio_id)}
                      className="text-red-500 text-sm hover:text-red-700 font-medium"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* 上傳作品 Modal */}
      <Modal 
        isOpen={isPortfolioModalOpen} 
        onClose={() => setIsPortfolioModalOpen(false)}
        title="上傳新作品"
      >
        <form onSubmit={handleUploadWork} className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            {uploadWorkFile ? (
              <div className="relative">
                <img 
                  src={URL.createObjectURL(uploadWorkFile)} 
                  alt="Preview" 
                  className="mx-auto h-48 object-contain rounded-md"
                />
                <button 
                  type="button"
                  onClick={() => setUploadWorkFile(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  更換圖片
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="mx-auto h-12 w-12 text-gray-400">📷</div>
                <span className="mt-2 block text-sm font-medium text-blue-600">點擊上傳圖片</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleWorkFileChange} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">風格標籤</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={workStyleTag}
              onChange={(e) => setWorkStyleTag(e.target.value)}
            >
              <option value="韓系">韓系 (Korean)</option>
              <option value="日系">日系 (Japanese)</option>
              <option value="歐美">歐美 (Western)</option>
              <option value="復古">復古 (Retro)</option>
              <option value="街頭">街頭 (Street)</option>
              <option value="染髮">特殊染 (Color)</option>
              <option value="剪裁">俐落剪裁 (Cut)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作品描述</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="輸入作品描述..."
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsPortfolioModalOpen(false)}>取消</Button>
            <Button type="submit" disabled={isUploadingWork || !uploadWorkFile}>
              {isUploadingWork ? '上傳中...' : '確認發佈'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Portfolio;