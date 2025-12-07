import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { managerAPI } from '../../services/api';

interface SalesData {
  kpi: {
    current_revenue: number;
    last_revenue: number;
    growth_rate: number;
    active_customers: number;
  };
  metrics: {
    avg_interval_days: number;
    acquisition_rate: number;
    retention_rate: number;
    churn_rate: number;
  };
  trend: {
    month: string;
    revenue: number;
    order_count: number;
  }[];
}

const SalesAnalysis: React.FC = () => {
  const [data, setData] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await managerAPI.getSalesAnalysis();
        setData(res);
      } catch (error) {
        console.error('載入失敗', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading || !data) return <div className="p-10 text-center text-gray-500">正在計算銷售數據...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">銷售情況分析</h1>
          <p className="text-gray-500 mt-2">
            即時監控營收成長、顧客留存與獲取效率。
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2">
        指標定義
        </Button>
      </div>

      {/* 1. 核心 KPI 區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* 本月營收 */}
        <Card className="bg-white border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">本月營收 (Revenue)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              ${data.kpi.current_revenue.toLocaleString()}
            </span>
            <span className={`text-sm font-medium ${data.kpi.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.kpi.growth_rate >= 0 ? '↑' : '↓'} {Math.abs(data.kpi.growth_rate)}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">與上月 (${data.kpi.last_revenue.toLocaleString()}) 相比</p>
        </Card>

        {/* 顧客獲取率 */}
        <Card className="bg-white border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">新客佔比 (Acquisition)</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{data.metrics.acquisition_rate}%</p>
          <p className="text-xs text-gray-400 mt-1">本月消費客中新客的比例</p>
        </Card>

        {/* 留存率 */}
        <Card className="bg-white border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">留存率 (Retention)</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{data.metrics.retention_rate}%</p>
          <p className="text-xs text-gray-400 mt-1">上月客人在本月的回購率</p>
        </Card>

        {/* 平均購買間隔 */}
        <Card className="bg-white border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-500">平均購買間隔</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{data.metrics.avg_interval_days} 天</p>
          <p className="text-xs text-gray-400 mt-1">顧客平均多久回來消費一次</p>
        </Card>
      </div>

      {/* 2. 營收趨勢圖表 (CSS Bar Chart) */}
      <Card className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6">近 6 個月營收趨勢</h3>
        <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-gray-200 pb-2">
          {data.trend.map((t) => {
            const val = Number(t.revenue);
            const allValues = data.trend.map(d => Number(d.revenue));
            const safeMax = Math.max(...allValues) || 1; 
            let heightPercent = (val / safeMax) * 100;
            if (val > 0 && heightPercent < 1) heightPercent = 1; 

            return (
              <div key={t.month} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div className="relative w-full flex justify-center items-end h-full">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {t.month}: ${val.toLocaleString()}
                  </div>
                  
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[50px] bg-blue-500 rounded-t-md hover:bg-blue-600 transition-all cursor-pointer relative"
                    style={{ height: `${heightPercent}%` }}
                  >
                     <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
                       {val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                     </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600 font-medium">{t.month.slice(5)}月</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. 流失率警示 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
        <div className="text-3xl">⚠️</div>
        <div>
          <h4 className="font-bold text-red-800">流失率警示：{data.metrics.churn_rate}%</h4>
          <p className="text-red-700 text-sm mt-1">
            上個月有來的客人，這個月有 {data.metrics.churn_rate}% 沒有回來。
          </p>
        </div>
      </div>

      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} title="銷售指標定義說明">
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="font-bold text-gray-900">1. 銷售成長率 (Growth Rate)</h4>
            <p className="bg-gray-50 p-2 rounded mt-1">(本月營收 - 上月營收) ÷ 上月營收</p>
            <p className="text-gray-500 mt-1">正數代表成長，負數代表衰退。</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900">2. 顧客獲取率 (Acquisition Rate)</h4>
            <p className="bg-gray-50 p-2 rounded mt-1">本月新首購客 ÷ 本月總活躍客</p>
            <p className="text-gray-500 mt-1">觀察本月業績有多少比例是靠新客人貢獻的。</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900">3. 平均購買間隔 (Purchase Interval)</h4>
            <p className="bg-gray-50 p-2 rounded mt-1">顧客兩次消費日期間隔天數的平均值</p>
            <p className="text-gray-500 mt-1">數字越小代表客人越常來。</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900">4. 留存率 (Retention Rate)</h4>
            <p className="bg-gray-50 p-2 rounded mt-1">上月活躍客在本月的回購比例</p>
            <p className="text-gray-500 mt-1">衡量舊客人的忠誠度。</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsGuideOpen(false)}>了解</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalesAnalysis;