import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { inventoryAPI } from '../../services/api';

// --- 型別定義 ---
interface Product {
  product_id: number;
  product_name: string;
  current_stock: number;
  unit_cost: number;
  supplier_name?: string;
  supplier_contact?: string; // 新增：後端有回傳，前端要接
  lead_time?: number;
  description?: string;
  image_url?: string;
  eoq?: number;
  rop?: number;
  status?: 'safe' | 'danger'; 
}

interface EOQData {
  annual_demand: number;
  ordering_cost: number;
  holding_cost_rate: number;
  safety_stock: number;
  eoq?: number;
  rop?: number;
}

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Modal 狀態 ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEOQModalOpen, setIsEOQModalOpen] = useState(false);
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // 新增：詳情 Modal

  // --- 資料狀態 ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [eoqFormData, setEoqFormData] = useState<EOQData>({
    annual_demand: 0,
    ordering_cost: 100,
    holding_cost_rate: 20,
    safety_stock: 0
  });

  // 交易表單 (數量改用 string 避免輸入卡頓，送出時再轉 number)
  const [transFormData, setTransFormData] = useState({
    type: 'IN', 
    quantity: '1', 
    notes: ''
  });

  // 1. 載入產品
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await inventoryAPI.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('載入失敗', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [refreshKey]);

  // 檔案選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 2. 新增產品
  const handleCreateProduct = async () => {
    try {
      const form = new FormData();
      form.append('product_name', formData.product_name || '');
      form.append('unit_cost', formData.unit_cost || 0);
      form.append('current_stock', formData.current_stock || 0);
      form.append('supplier_name', formData.supplier_name || '');
      form.append('supplier_contact', formData.supplier_contact || ''); // 新增欄位
      form.append('description', formData.description || ''); // 新增欄位
      form.append('lead_time', formData.lead_time || 0);
      
      if (selectedFile) {
        form.append('image', selectedFile);
      }

      await inventoryAPI.createProduct(form);
      
      setIsAddModalOpen(false);
      setFormData({});
      setSelectedFile(null);
      setRefreshKey(prev => prev + 1);
      alert('產品新增成功！');
    } catch (error) {
      console.error(error);
      alert('新增失敗，請檢查欄位');
    }
  };

  // 3. 開啟 EOQ 設定
  const openEOQModal = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const detail = await inventoryAPI.getProductDetail(product.product_id);
      setEoqFormData({
        annual_demand: Number(detail.annual_demand),
        ordering_cost: Number(detail.ordering_cost),
        holding_cost_rate: Number(detail.holding_cost_rate),
        safety_stock: detail.safety_stock,
        eoq: detail.eoq,
        rop: detail.rop
      });
      setIsEOQModalOpen(true);
    } catch (error) {
      console.error('無法載入 EOQ 參數');
    }
  };

  // 4. 更新 EOQ
  const handleUpdateEOQ = async () => {
    if (!selectedProduct) return;
    try {
      const result = await inventoryAPI.updateEOQ(selectedProduct.product_id, eoqFormData);
      setEoqFormData(prev => ({
        ...prev,
        eoq: result.data.eoq,
        rop: result.data.rop
      }));
      setRefreshKey(prev => prev + 1);
      alert('計算完成並已儲存參數！');
    } catch (error) {
      alert('更新失敗');
    }
  };

  // 5. 開啟交易 Modal
  const openTransModal = (product: Product, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    // 如果是進貨，且有 EOQ 建議值，預設填入 EOQ
    const defaultQty = (type === 'IN' && product.eoq && product.eoq > 0) ? String(product.eoq) : '1';
    setTransFormData({ type, quantity: defaultQty, notes: '' });
    setIsTransModalOpen(true);
  };

  // 6. 提交交易
  const handleTransaction = async () => {
    if (!selectedProduct) return;
    try {
      const qty = parseInt(transFormData.quantity);
      if (isNaN(qty) || qty <= 0) {
        alert('請輸入有效的數量');
        return;
      }

      const res = await inventoryAPI.addTransaction({
        product_id: selectedProduct.product_id,
        transaction_type: transFormData.type as 'IN' | 'OUT',
        quantity: qty,
        notes: transFormData.notes
      });
      
      setIsTransModalOpen(false);
      setRefreshKey(prev => prev + 1);

      if (res.warning) {
        alert(`交易成功！\n\n⚠️ 系統警示：${res.warning}`);
      } else {
        alert('交易成功！庫存已更新。');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '交易失敗');
    }
  };

  // 7. 開啟詳情 Modal
  const openDetailModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">存貨管理系統</h1>
          <p className="text-gray-500 mt-1 text-lg">智慧化庫存監控與 EOQ 自動訂購建議</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-pink-600 text-white shadow-lg text-lg px-6 py-3">
          + 新增產品
        </Button>
      </div>

      {/* 產品列表 (字體放大版) */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-lg">載入庫存資料中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 uppercase tracking-wider text-base border-b border-gray-200">
                  <th className="py-4 px-6 font-bold min-w-[300px]">產品資訊</th>
                  <th className="py-4 px-6 font-bold text-right">目前庫存</th>
                  <th className="py-4 px-6 font-bold text-right">再訂購點 (ROP)</th>
                  <th className="py-4 px-6 font-bold text-right">建議訂購 (EOQ)</th>
                  <th className="py-4 px-6 font-bold text-center">狀態</th>
                  <th className="py-4 px-6 font-bold text-center min-w-[200px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-base">
                {products.map((product) => {
                  const rop = product.rop || 0;
                  const isLowStock = product.current_stock <= rop;
                  const isZero = product.current_stock <= 0;

                  return (
                    <tr key={product.product_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => openDetailModal(product)}>
                            {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100 border border-gray-200"/>
                            ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 font-bold">無圖</div>
                            )}
                            <div>
                                <div className="font-bold text-gray-900 text-lg mb-1">{product.product_name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <span>{product.supplier_name || '未指定供應商'}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-pink-600 hover:underline">查看詳情</span>
                                </div>
                            </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <span className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.current_stock}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right text-gray-600 font-medium">
                        {product.rop ? product.rop : '-'}
                      </td>
                      <td className="py-5 px-6 text-right text-gray-600 font-medium">
                        {product.eoq ? product.eoq : '-'}
                      </td>
                      <td className="py-5 px-6 text-center">
                         {isZero ? (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">缺貨中</span>
                         ) : isLowStock ? (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 animate-pulse">需補貨</span>
                         ) : (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">安全</span>
                         )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                           <button 
                             onClick={() => openTransModal(product, 'IN')}
                             className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-bold border border-green-200 shadow-sm transition-all"
                           >
                             進貨
                           </button>
                           <button 
                             onClick={() => openTransModal(product, 'OUT')}
                             className="bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 shadow-sm transition-all"
                           >
                             銷售
                           </button>
                           <button 
                             onClick={() => openEOQModal(product)}
                             className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                             title="EOQ 設定"
                           >
                             <span className="text-xl">⚙️</span>
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --- 1. 新增產品 Modal (加入供應商聯絡、描述) --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新增庫存產品">
        <div className="space-y-4">
            <div>
                <label className="block text-base font-medium text-gray-700 mb-1">產品名稱 *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    onChange={e => setFormData({...formData, product_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">單位成本 ($) *</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg p-3"
                        onChange={e => setFormData({...formData, unit_cost: e.target.value})} />
                </div>
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">初始庫存</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg p-3"
                        onChange={e => setFormData({...formData, current_stock: e.target.value})} />
                </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <h4 className="font-bold text-gray-700">📦 供應商資訊</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">供應商名稱</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">聯絡電話/Email</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            placeholder="例: 02-1234-5678"
                            onChange={e => setFormData({...formData, supplier_contact: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">前置時間 (天)</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="從訂貨到到貨天數"
                        onChange={e => setFormData({...formData, lead_time: e.target.value})} />
                </div>
            </div>

            <div>
                <label className="block text-base font-medium text-gray-700 mb-1">產品描述/備註</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-3 h-20 text-sm"
                    onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div>
                <label className="block text-base font-medium text-gray-700 mb-1">產品圖片</label>
                <div className="flex items-center gap-4 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <input 
                        type="file" 
                        accept="image/*"
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-pink-600 file:text-white
                          hover:file:bg-pink-700 cursor-pointer"
                        onChange={handleFileChange}
                    />
                </div>
                {selectedFile && <p className="text-sm text-green-600 mt-1">已選擇: {selectedFile.name}</p>}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>取消</Button>
                <Button onClick={handleCreateProduct} className="bg-pink-600 text-white">建立產品</Button>
            </div>
        </div>
      </Modal>

      {/* --- 2. 產品詳情 Modal (新增功能) --- */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="產品詳細資訊">
        {selectedProduct && (
            <div className="space-y-6">
                {/* 圖片與基本資訊 */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                        {selectedProduct.image_url ? (
                            <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">無圖片</div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{selectedProduct.product_name}</h3>
                            <p className="text-gray-500 mt-1">編號: #{selectedProduct.product_id}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div>
                                <span className="text-xs text-gray-500 uppercase block">目前庫存</span>
                                <span className="text-2xl font-bold text-gray-900">{selectedProduct.current_stock}</span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase block">單位成本</span>
                                <span className="text-2xl font-bold text-gray-700">${selectedProduct.unit_cost}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-2 border-b pb-1">供應商資訊</h4>
                            <div className="space-y-1 text-sm text-gray-700">
                                <p><span className="text-gray-500 w-20 inline-block">名稱:</span> {selectedProduct.supplier_name || '未設定'}</p>
                                <p><span className="text-gray-500 w-20 inline-block">聯絡方式:</span> {selectedProduct.supplier_contact || '未設定'}</p>
                                <p><span className="text-gray-500 w-20 inline-block">前置時間:</span> {selectedProduct.lead_time} 天</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 描述 */}
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-bold text-gray-900 mb-2">產品描述</h4>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {selectedProduct.description || "尚無產品描述..."}
                    </p>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsDetailModalOpen(false)}>關閉</Button>
                </div>
            </div>
        )}
      </Modal>

      {/* --- 3. EOQ 設定 Modal --- */}
      <Modal isOpen={isEOQModalOpen} onClose={() => setIsEOQModalOpen(false)} title={`庫存策略設定：${selectedProduct?.product_name}`}>
         <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-base text-blue-800">
                輸入參數後，系統將自動計算<strong>最佳訂購量 (EOQ)</strong> 與 <strong>再訂購點 (ROP)</strong>。
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">年需求量 (D)</label>
                    <input type="number" value={eoqFormData.annual_demand} 
                        className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                        onChange={e => setEoqFormData({...eoqFormData, annual_demand: Number(e.target.value)})} />
                </div>
                 <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">安全存量 (Buffer)</label>
                    <input type="number" value={eoqFormData.safety_stock} 
                        className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                        onChange={e => setEoqFormData({...eoqFormData, safety_stock: Number(e.target.value)})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">每次訂購成本 (S)</label>
                    <input type="number" value={eoqFormData.ordering_cost} 
                        className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                        onChange={e => setEoqFormData({...eoqFormData, ordering_cost: Number(e.target.value)})} />
                </div>
                 <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">持有成本率 (%)</label>
                    <input type="number" value={eoqFormData.holding_cost_rate} 
                        className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                        onChange={e => setEoqFormData({...eoqFormData, holding_cost_rate: Number(e.target.value)})} />
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl">
                <div className="text-center">
                    <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">最佳訂購量 (EOQ)</div>
                    <div className="text-4xl font-extrabold text-gray-900 my-2">{eoqFormData.eoq ? eoqFormData.eoq : '-'}</div>
                    <div className="text-sm text-gray-500">建議每次買這些</div>
                </div>
                <div className="text-center border-l border-gray-200">
                    <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">再訂購點 (ROP)</div>
                    <div className="text-4xl font-extrabold text-pink-600 my-2">{eoqFormData.rop ? eoqFormData.rop : '-'}</div>
                    <div className="text-sm text-gray-500">低於此數請補貨</div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setIsEOQModalOpen(false)}>關閉</Button>
                <Button onClick={handleUpdateEOQ} className="bg-blue-600 text-white hover:bg-blue-700">儲存並計算</Button>
            </div>
         </div>
      </Modal>

      {/* --- 4. 交易 (進貨/銷貨) Modal (優化輸入體驗) --- */}
      <Modal 
        isOpen={isTransModalOpen} 
        onClose={() => setIsTransModalOpen(false)} 
        title={`${transFormData.type === 'IN' ? '📦 商品進貨' : '💰 商品銷售'} - ${selectedProduct?.product_name}`}
      >
        <div className="space-y-6">
            <div>
                <label className="block text-lg font-bold text-gray-700 mb-2">
                    交易數量 ({transFormData.type === 'IN' ? '入庫' : '出庫'})
                </label>
                <div className="flex items-center gap-2">
                    {/* 超大輸入框，改用 type="number" 但允許清空 */}
                    <input 
                        type="number" 
                        min="1" 
                        value={transFormData.quantity}
                        className={`w-full border-2 rounded-xl p-4 text-4xl font-bold text-center outline-none focus:ring-4 transition-all
                            ${transFormData.type === 'IN' 
                                ? 'border-green-200 text-green-700 focus:border-green-500 focus:ring-green-100' 
                                : 'border-red-200 text-red-700 focus:border-red-500 focus:ring-red-100'
                            }`}
                        onChange={e => setTransFormData({...transFormData, quantity: e.target.value})} 
                        onFocus={e => e.target.select()} // 點擊時全選，方便直接修改
                    />
                </div>
                
                {/* 快速按鈕區 */}
                <div className="flex gap-2 mt-3 justify-center overflow-x-auto py-1">
                    {[1, 5, 10, 20, 50].map(num => (
                        <button
                            key={num}
                            onClick={() => {
                                const current = parseInt(transFormData.quantity) || 0;
                                setTransFormData({...transFormData, quantity: String(current + num)});
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-600 text-sm transition-colors whitespace-nowrap"
                        >
                            +{num}
                        </button>
                    ))}
                    {transFormData.type === 'IN' && selectedProduct?.eoq && (
                         <button
                            onClick={() => setTransFormData({...transFormData, quantity: String(selectedProduct.eoq)})}
                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
                         >
                            EOQ ({selectedProduct.eoq})
                         </button>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-base font-medium text-gray-700 mb-1">備註 (選填)</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-3 h-24 text-base"
                    placeholder="例如：廠商進貨單號、櫃檯零售..."
                    value={transFormData.notes}
                    onChange={e => setTransFormData({...transFormData, notes: e.target.value})} />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsTransModalOpen(false)} className="px-6 py-3 text-base">取消</Button>
                <Button 
                   onClick={handleTransaction}
                   className={`px-8 py-3 text-base font-bold text-white shadow-lg transform active:scale-95 transition-all
                       ${transFormData.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                   確認{transFormData.type === 'IN' ? '進貨' : '銷售'}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;