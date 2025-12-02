import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend, ReferenceLine
} from 'recharts';

interface RFMCustomer {
  name: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  segment: string;
  color: string;
}

interface Props {
  data: RFMCustomer[];
  fullData: RFMCustomer[];
}

const SEGMENT_COLORS: Record<string, string> = {
  "超級常客": "#9333ea", 
  "潛力新客": "#16a34a", 
  "沈睡顧客": "#ea580c", 
  "流失大戶": "#dc2626", 
  "忠誠熟客": "#2563eb", 
  "活躍顧客": "#0d9488", 
  "一般顧客": "#4b5563", 
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm z-50">
        <p className="font-bold text-gray-900 mb-1">{data.name}</p>
        <p className="text-gray-600">分群：<span style={{ color: data.color }}>{data.segment}</span></p>
        <p className="text-gray-600">上次消費：{data.recency_days} 天前</p>
        <p className="text-gray-600">消費次數：{data.frequency} 次</p>
        <p className="text-gray-600">消費總額：${data.monetary.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const RFMChart: React.FC<Props> = ({ data, fullData }) => {
  
  // 計算固定座標軸範圍 (確保切換類別時比例尺不動)
  const axisLimits = useMemo(() => {
    // 防呆：如果 fullData 是空的，給個預設值
    if (!fullData || fullData.length === 0) return { xMax: 365, yMax: 20 };

    const maxR = Math.max(...fullData.map(d => d.recency_days), 0);
    const maxF = Math.max(...fullData.map(d => d.frequency), 0);

    return {
      xMax: Math.max(maxR, 60) + 20, 
      yMax: Math.max(maxF, 5) + 1 
    };
  }, [fullData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 h-[500px]">
      <h3 className="text-lg font-bold text-gray-900 mb-4">顧客分佈矩陣 (RFM Matrix)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart 
          // margin.bottom 設定 80，留空間給下面的字
          margin={{ top: 20, right: 20, bottom: 80, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          <XAxis 
            type="number" 
            dataKey="recency_days" 
            name="上次消費天數" 
            unit="天" 
            domain={[0, axisLimits.xMax]}
            // 這裡調整：offset: 0 讓它緊貼數字，position: 'bottom' 放在軸下方
            label={{ 
              value: '距離上次消費天數 (越左越好)', 
              position: 'bottom', 
              offset: 0 
            }}
          />
          
          <YAxis 
            type="number" 
            dataKey="frequency" 
            name="消費頻率" 
            unit="次" 
            domain={[0, axisLimits.yMax]}
            label={{ value: '消費頻率 (越上越好)', angle: -90, position: 'insideLeft', dx: -10 }}
          />
          
          <ZAxis type="number" dataKey="monetary" range={[60, 500]} name="消費金額" />
          
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          {/* 關鍵修正：
            wrapperStyle={{ bottom: 0 }} -> 強制把 Legend 鎖死在整個容器的最底端
            這樣它就絕對不會跑上去跟 X 軸標題重疊
          */}
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconSize={10}
            // 1. bottom: 10 -> 讓它從最底部往上浮 10px，不要貼底
            wrapperStyle={{ bottom: 20, left: 0, width: '100%' }}
            // 2. formatter -> 用來美化文字，並加上 mr-6 (右邊距) 把它們撐開
            formatter={(value) => (
              <span className="text-gray-600 font-medium mr-6">{value}</span>
            )}
          />

          <ReferenceLine x={120} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "流失警戒 (120天)", position: 'insideTopRight', fill: '#ef4444', fontSize: 12 }} />
          <ReferenceLine y={3} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: "熟客門檻 (3次)", position: 'insideRight', fill: '#3b82f6', fontSize: 12 }} />

          {Object.keys(SEGMENT_COLORS).map((segmentName) => (
            <Scatter
              key={segmentName}
              name={segmentName}
              data={data.filter(d => d.segment === segmentName)}
              fill={SEGMENT_COLORS[segmentName]}
              fillOpacity={0.7} 
            />
          ))}

        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RFMChart;