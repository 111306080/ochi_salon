import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal'; 
import Button from '../../components/common/Button';
import { managerAPI } from '../../services/api';

interface RFMCustomer {
  customer_id: number;
  name: string;
  phone: string;
  recency_days: number; // 上次消費距今天數
  frequency: number;    // 消費次數
  monetary: number;     // 總消費金額
  segment: string;      // 分群標籤 (如：超級常客)
  color: string;        // 標籤顏色
}

interface Summary {
  total_revenue: number;
  total_customers: number;
  active_customers: number;
  churn_risk: number;
}

const SEGMENT_RULES = [
  {
    name: "超級常客",
    color: "purple",
    condition: "R分數≥4 & F分數≥4 & M分數≥4",
    desc: "最近4個月內有來、頻率高(6次以上)、且累積消費破萬。這是最核心的 VIP，請務必優先服務。"
  },
  {
    name: "潛力新客",
    color: "green",
    condition: "R分數≥4 & F分數≤2",
    desc: "最近4個月內剛來過，但累積次數只有1-2次。行銷重點：想辦法讓他第二次回購。"
  },
  {
    name: "沈睡顧客",
    color: "orange",
    condition: "R分數≤2 & F分數≥4",
    desc: "以前常來(4次以上)，但已經超過半年沒來了。行銷重點：發送喚醒優惠券。"
  },
  {
    name: "流失大戶",
    color: "red",
    condition: "R分數≤2 & M分數≥4",
    desc: "以前消費總額很高(破萬)，但超過半年沒來了。損失這類客戶對營收影響最大。"
  },
  {
    name: "忠誠熟客",
    color: "blue",
    condition: "F分數≥4",
    desc: "長期支持的熟客(6次以上)，消費頻率穩定。"
  },
  {
    name: "活躍顧客",
    color: "teal",
    condition: "R分數≥3",
    desc: "近期(半年內)有消費，但頻率或金額尚未達到 VIP 標準。"
  },
  {
    name: "一般顧客",
    color: "gray",
    condition: "其他",
    desc: "尚未歸類到上述特徵的散客。"
  }
];

const CustomerAnalysis: React.FC = () => {
  const [customers, setCustomers] = useState<RFMCustomer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState('All');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await managerAPI.getRFMAnalysis();
        setCustomers(data.customers);
        setSummary(data.summary);
      } catch (error) {
        console.error('無法載入分析資料', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const segments = ['All', ...Array.from(new Set(customers.map(c => c.segment)))];

  const filteredCustomers = filterSegment === 'All' 
    ? customers 
    : customers.filter(c => c.segment === filterSegment);

  if (isLoading) return <div className="p-10 text-center text-gray-500">正在進行大數據分析...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">顧客價值分析 (RFM)</h1>
        </div>
        
        <Button variant="outline" onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2">
          分群定義說明
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase">累積總營收</h3>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              ${summary.total_revenue.toLocaleString()}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase">有效會員數</h3>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {summary.total_customers} 人
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase">活躍顧客 (近3月)</h3>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {summary.active_customers} 人
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase">流失風險 (熟客)</h3>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {summary.churn_risk} 人
            </p>
            <p className="text-xs text-red-400 mt-1">超過半年未回購的熟客</p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {segments.map(seg => (
          <button
            key={seg}
            onClick={() => setFilterSegment(seg)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterSegment === seg
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {seg}
            {seg !== 'All' && (
              <span className="ml-2 text-xs opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full">
                {customers.filter(c => c.segment === seg).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-6 font-medium">顧客姓名</th>
                <th className="py-3 px-6 font-medium">顧客標籤</th>
                <th className="py-3 px-6 font-medium text-right">上次消費 (R)</th>
                <th className="py-3 px-6 font-medium text-right">頻率 (F)</th>
                <th className="py-3 px-6 font-medium text-right">總金額 (M)</th>
                <th className="py-3 px-6 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50/50">
                  <td className="py-4 px-6">
                    <div className="font-bold text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-400">{customer.phone}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${customer.color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
                      ${customer.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                      ${customer.color === 'orange' ? 'bg-orange-100 text-orange-800' : ''}
                      ${customer.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                      ${customer.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
                      ${customer.color === 'teal' ? 'bg-teal-100 text-teal-800' : ''}
                      ${customer.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {customer.segment}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`font-bold ${customer.recency_days > 180 ? 'text-red-500' : 'text-gray-700'}`}>
                      {customer.recency_days} 天前
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-gray-700">
                    {customer.frequency} 次
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-gray-900">
                    ${customer.monetary.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-center">
                     <button className="text-pink-600 hover:text-pink-800 text-xs font-bold border border-pink-200 hover:bg-pink-50 px-3 py-1 rounded transition-colors">
                       查看詳情
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        title="RFM 分群定義說明"
      >
        <div className="space-y-4">
          
          <div className="space-y-3">
            {SEGMENT_RULES.map((rule) => (
              <div key={rule.name} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold
                     ${rule.color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
                     ${rule.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                     ${rule.color === 'orange' ? 'bg-orange-100 text-orange-800' : ''}
                     ${rule.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                     ${rule.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
                     ${rule.color === 'teal' ? 'bg-teal-100 text-teal-800' : ''}
                     ${rule.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {rule.name}
                  </span>
                  <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded">
                    {rule.condition}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            <h4 className="font-bold mb-1">評分標準參考：</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>R分數：4分 = 4個月內有來，2分 = 超過半年沒來</li>
              <li>F分數：4分 = 累積6次以上，2分 = 累積2次以下</li>
              <li>M分數：4分 = 累積消費$10,000以上</li>
            </ul>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={() => setIsGuideOpen(false)}>
              了解
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerAnalysis;