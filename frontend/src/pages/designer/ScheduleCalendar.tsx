import React, { useState, useEffect } from 'react';

interface Reservation {
  reservation_id: number;
  reserved_time: string;
  status: string;
  customer_name: string;
  service_name: string;
  duration_min: number;
}

interface Props {
  reservations: Reservation[];
}

const ScheduleCalendar: React.FC<Props> = ({ reservations }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // [除錯] 當資料進來時，印出第一筆來檢查格式
  useEffect(() => {
    if (reservations.length > 0) {
      console.log("🔥 [行事曆收到資料]", reservations);
      const firstRes = reservations[0];
      console.log("🔍 [第一筆時間字串]", firstRes.reserved_time);
      console.log("📅 [嘗試解析日期]", new Date(firstRes.reserved_time));
    } else {
      console.log("⚠️ [行事曆] 目前沒有收到任何預約資料 (長度為 0)");
    }
  }, [reservations]);

  // 產生一週的日期 (從週日開始)
  const getWeekDates = (baseDate: Date) => {
    const week = [];
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay()); // 設定為週日

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(currentDate);
  // [擴大範圍] 為了怕時區跑掉，我們先顯示 09:00 - 22:00
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 9); 

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentDate(newDate);
  };

  // 核心比對邏輯
  const getEvent = (date: Date, hour: number) => {
    return reservations.find(r => {
      if (r.status === '已取消') return false;

      // 1. 強力解析時間
      // 後端可能回傳: "Thu, 27 Nov 2025 14:00:00 GMT" (Flask 預設) 或 "2025-11-27 14:00:00"
      let rDate = new Date(r.reserved_time);

      // 如果直接解析失敗，嘗試替換字元 (針對 Safari/Firefox)
      if (isNaN(rDate.getTime())) {
        const fixedTime = r.reserved_time.replace(/-/g, '/');
        rDate = new Date(fixedTime);
      }

      // 如果還是失敗，直接放棄這筆
      if (isNaN(rDate.getTime())) return false;

      // 2. 解決時區問題 (重要！)
      // 如果後端回傳的是 GMT 字串，瀏覽器會自動 +8 小時，導致 14:00 變成 22:00
      // 這裡我們做一個防禦：如果發現年份對、日期對，但小時差 8 小時，就視為同一天
      // 但最準確的方法是依賴 getFullYear/Month/Date/Hours (本地時間)
      
      const isSameYear = rDate.getFullYear() === date.getFullYear();
      const isSameMonth = rDate.getMonth() === date.getMonth();
      const isSameDate = rDate.getDate() === date.getDate();
      const isSameHour = rDate.getHours() === hour;

      // [除錯] 如果是同一天，印出來看看為什麼小時沒對上
      if (isSameDate && isSameMonth) {
        // console.log(`比對詳細: 目標=${hour}點, 資料=${rDate.getHours()}點 (${r.customer_name})`);
      }

      return isSameYear && isSameMonth && isSameDate && isSameHour;
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-800">🗓️ 行程表</h2>
        <div className="flex gap-2">
          <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-100 rounded">◀</button>
          <span className="font-medium">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </span>
          <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-100 rounded">▶</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* 表頭 */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-center text-gray-400 font-medium">時段</div>
            {weekDates.map((d, i) => (
              <div key={i} className={`text-center font-bold p-2 rounded ${
                d.toDateString() === new Date().toDateString() ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
              }`}>
                {['日','一','二','三','四','五','六'][d.getDay()]} <br/>
                <span className="text-xs font-normal">{d.getDate()}</span>
              </div>
            ))}
          </div>

          {/* 表格內容 */}
          {timeSlots.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-1 border-t border-gray-100">
              <div className="p-3 text-center text-xs text-gray-500 font-medium relative -top-3">
                {hour}:00
              </div>

              {weekDates.map((date, i) => {
                const event = getEvent(date, hour);
                return (
                  <div key={i} className="h-20 border-l border-gray-100 relative group p-1">
                    {event && (
                      <div className={`
                        w-full h-full rounded p-1 text-xs cursor-pointer transition-all hover:scale-105 shadow-sm
                        text-white
                        ${/* [除錯] 增加預設顏色，避免因為 status 對不上而變透明 */ ''}
                        ${event.status === '待確認' ? 'bg-yellow-500' : 
                          event.status === '已確認' ? 'bg-blue-500' : 
                          event.status === '已完成' ? 'bg-green-500' : 'bg-gray-400'}
                      `}>
                        <div className="font-bold truncate">{event.customer_name}</div>
                        <div className="truncate">{event.service_name}</div>
                        {/* 顯示時間，方便除錯 */}
                        <div className="text-[10px] opacity-80">
                            {new Date(event.reserved_time).getHours()}:00
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;