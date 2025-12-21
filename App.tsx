
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  LogOut, 
  User, 
  ClipboardList, 
  AlertCircle, 
  Package, 
  Waves, 
  Flame, 
  CircleDot, 
  Minus, 
  Plus, 
  X, 
  Check, 
  Wallet, 
  ArrowUpRight, 
  TrendingDown, 
  LayoutDashboard, 
  PlusCircle, 
  Coins, 
  History, 
  Info, 
  RefreshCcw, 
  ShieldAlert, 
  UserPlus, 
  UserMinus, 
  Pencil,
  UtensilsCrossed
} from 'lucide-react';

/** 
 * CONSTANTS & TYPES 
 */

const DEFAULT_MENU_ITEMS = [
  { id: 'bento', name: '便當', price: 90, icon: Package, color: 'text-orange-600' },
  { id: 'riceNoodle', name: '米粉', price: 80, icon: Waves, color: 'text-blue-500' },
  { id: 'friedNoodle', name: '炒麵', price: 80, icon: Flame, color: 'text-red-600' },
  { id: 'dumplings', name: '水餃', price: 70, icon: CircleDot, color: 'text-emerald-600' },
] as const;

type MenuItemId = typeof DEFAULT_MENU_ITEMS[number]['id'];

interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon: any;
  color: string;
}

interface DailyOrder {
  [key: string]: number; // MenuItemId -> count
}

interface UserData {
  userName: string;
  balance: number; // Current balance (目前儲值金)
  selections: {
    [dateStr: string]: DailyOrder;
  };
}

const INITIAL_NAMES = [
  "張芷涵", "陳怡君", "劉宛蓉", "吳思潔", "蔡欣怡", 
  "周承翰", "許雅婷", "楊佳穎", "羅慧玲", "鄭志宏", 
  "曾文傑", "簡家豪", "蘇雅涵", "方麗華", "江佩雯", 
  "高俊凱", "連雅雯", "張惠茜", "李婉柔", "傅雅玲"
];

const WEEK_DAYS = ["週一", "週二", "週三", "週四", "週五"];

/**
 * UTILITIES
 */

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * MAIN APP COMPONENT
 */

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', pwd: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'order' | 'manage' | 'menu'>('order');
  
  // Menu Management State
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('bento_menu_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Map back icons since they are components
        return parsed.map((item: any) => ({
          ...item,
          icon: DEFAULT_MENU_ITEMS.find(d => d.id === item.id)?.icon || Package
        }));
      }
    } catch (e) {
      console.error("Failed to load menu", e);
    }
    return [...DEFAULT_MENU_ITEMS];
  });

  // Modal States
  const [modalData, setModalData] = useState<{ userName: string, dateStr: string, label: string } | null>(null);
  const [rechargeModal, setRechargeModal] = useState<{ userName: string, currentBalance: number } | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // User Management State
  const [userModal, setUserModal] = useState<{ mode: 'add' | 'edit', oldName?: string, currentName: string } | null>(null);
  
  // Menu Edit Modal State
  const [menuEditModal, setMenuEditModal] = useState<MenuItem | null>(null);

  // Custom Alert/Confirm States (Fixes Sandbox confirm/alert issue)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ title: string, message: string, type: 'success' | 'error' } | null>(null);
  
  // Date Management
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  
  // User Data State
  const [users, setUsers] = useState<UserData[]>(() => {
    try {
      const saved = localStorage.getItem('bento_users_v9');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse saved data", e);
    }
    return INITIAL_NAMES.map(name => ({
      userName: name,
      balance: 0,
      selections: {}
    }));
  });

  // Persist data locally
  useEffect(() => {
    localStorage.setItem('bento_users_v9', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    // When saving menu, we don't save the icon component directly
    const toSave = menuItems.map(({ icon, ...rest }) => rest);
    localStorage.setItem('bento_menu_v2', JSON.stringify(toSave));
  }, [menuItems]);

  // Derived Week Dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return {
        label: WEEK_DAYS[i],
        dateStr: formatDate(d),
        fullDate: d
      };
    });
  }, [currentWeekStart]);

  /**
   * HELPERS
   */

  const getUserWeeklyTotal = useCallback((user: UserData) => {
    let total = 0;
    weekDates.forEach(wd => {
      const dayOrder = user.selections[wd.dateStr];
      if (dayOrder) {
        menuItems.forEach(item => {
          total += (dayOrder[item.id] || 0) * item.price;
        });
      }
    });
    return total;
  }, [weekDates, menuItems]);

  const currentSelections = useMemo(() => {
    if (!modalData) return {} as Record<string, number>;
    const user = users.find(u => u.userName === modalData.userName);
    return (user?.selections[modalData.dateStr] || {}) as Record<string, number>;
  }, [users, modalData]);

  /**
   * HANDLERS
   */

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.id === 'bento' && loginForm.pwd === 'bento') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('帳號或密碼錯誤 (提示: bento / bento)');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginForm({ id: '', pwd: '' });
    setActiveTab('order');
  };

  const updateOrderQuantity = (userName: string, dateStr: string, itemId: string, delta: number) => {
    setUsers(prev => prev.map(user => {
      if (user.userName !== userName) return user;
      
      const newSelections = { ...user.selections };
      const currentDay = { ...(newSelections[dateStr] || {}) };
      const currentVal = currentDay[itemId] || 0;
      const newVal = Math.max(0, currentVal + delta);
      
      if (newVal === 0) {
        delete currentDay[itemId];
      } else {
        currentDay[itemId] = newVal;
      }
      
      if (Object.keys(currentDay).length === 0) {
        delete newSelections[dateStr];
      } else {
        newSelections[dateStr] = currentDay;
      }
      
      return { ...user, selections: newSelections };
    }));
  };

  const handleRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeModal) return;
    const amt = parseInt(customAmount);
    if (!isNaN(amt) && amt !== 0) {
      setUsers(prev => prev.map(user => {
        if (user.userName !== rechargeModal.userName) return user;
        return { ...user, balance: user.balance + amt };
      }));
    }
    setRechargeModal(null);
    setCustomAmount('');
  };

  const executeSettlement = () => {
    setUsers(prev => prev.map(user => {
      const weeklySpent = getUserWeeklyTotal(user);
      const settledBalance = user.balance - weeklySpent;
      return { 
        ...user, 
        balance: settledBalance,
        selections: {} 
      };
    }));
    setConfirmDialog(null);
    setNotification({
      title: '成功結算!',
      message: '目前的訂餐表已清除，帳戶餘額已更新!',
      type: 'success'
    });
  };

  const triggerSettlement = () => {
    setConfirmDialog({
      title: '!!! 請注意 !!!',
      message: '是否確定要執行本週結算？這將會扣除每位同事的本週餐費並歸零訂單。',
      onConfirm: executeSettlement
    });
  };

  const handleUserAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userModal) return;
    const name = userModal.currentName.trim();
    if (!name) return;

    if (userModal.mode === 'add') {
      if (users.some(u => u.userName === name)) {
        setNotification({ title: '錯誤', message: '該名稱已存在!', type: 'error' });
        return;
      }
      setUsers(prev => [...prev, { userName: name, balance: 0, selections: {} }]);
    } else if (userModal.mode === 'edit' && userModal.oldName) {
      if (name !== userModal.oldName && users.some(u => u.userName === name)) {
        setNotification({ title: '錯誤', message: '該名稱已存在!', type: 'error' });
        return;
      }
      setUsers(prev => prev.map(u => u.userName === userModal.oldName ? { ...u, userName: name } : u));
    }
    setUserModal(null);
  };

  const triggerDeleteUser = (name: string) => {
    setConfirmDialog({
      title: '刪除人員確認',
      message: `確定要從系統中移除「${name}」嗎？這會同時清除其儲值金與訂餐紀錄。`,
      onConfirm: () => {
        setUsers(prev => prev.filter(u => u.userName !== name));
        setConfirmDialog(null);
      }
    });
  };

  const handleMenuUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuEditModal) return;
    setMenuItems(prev => prev.map(item => item.id === menuEditModal.id ? menuEditModal : item));
    setMenuEditModal(null);
    setNotification({ title: '成功', message: '餐點資訊已更新!', type: 'success' });
  };

  const navigateWeek = (weeks: number) => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (weeks * 7));
      return d;
    });
  };

  const handleQuickAdd = (amt: number) => {
    setCustomAmount(prev => {
      const current = parseInt(prev) || 0;
      return (current + amt).toString();
    });
  };

  /**
   * DERIVED STATS
   */

  const stats = useMemo(() => {
    const dailyStats = weekDates.map(wd => {
      const itemCounts: Record<string, number> = {};
      let dailyTotal = 0;
      
      menuItems.forEach(item => {
        let count = 0;
        users.forEach(user => {
          count += (user.selections[wd.dateStr]?.[item.id] || 0);
        });
        itemCounts[item.id] = count;
        dailyTotal += count * item.price;
      });
      
      return {
        dateStr: wd.dateStr,
        label: wd.label,
        itemCounts,
        dailyTotal
      };
    });

    const weeklyGrandTotal = dailyStats.reduce((sum, day) => sum + day.dailyTotal, 0);
    return { dailyStats, weeklyGrandTotal };
  }, [users, weekDates, menuItems]);

  /**
   * UI COMPONENTS
   */

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9] p-4 font-['Noto_Sans_TC']">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="bg-[#e8f0fe] w-24 h-24 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <ClipboardList className="text-[#0b57d0] w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">辦公室訂餐系統</h1>
            <p className="text-gray-500 mt-2 font-medium">Material Design 管理平台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">帳號 ID</label>
              <input 
                type="text" 
                value={loginForm.id}
                onChange={e => setLoginForm({...loginForm, id: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] focus:ring-4 focus:ring-[#0b57d0]/10 outline-none transition-all text-gray-900 font-bold placeholder-gray-300"
                placeholder="bento"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">密碼 Password</label>
              <input 
                type="password" 
                value={loginForm.pwd}
                onChange={e => setLoginForm({...loginForm, pwd: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] focus:ring-4 focus:ring-[#0b57d0]/10 outline-none transition-all text-gray-900 font-bold placeholder-gray-300"
                placeholder="bento"
              />
            </div>
            
            {loginError && (
              <div className="bg-[#fce8e6] text-[#d93025] p-4 rounded-2xl text-sm flex items-center gap-3 border border-[#f5c2c7] animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{loginError}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-black py-4 rounded-2xl shadow-lg transform active:scale-[0.97] transition-all text-lg tracking-wide"
            >
              登入系統
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
            <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Google Material Design 3</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f9] flex flex-col pb-10 font-['Noto_Sans_TC']">
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#0b57d0] p-2.5 rounded-xl shadow-md">
              <Calendar className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">辦公室訂餐管理</h1>
              <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.15em]">Office Catering Suite</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <nav className="flex bg-gray-100/80 p-1.5 rounded-2xl mr-2 whitespace-nowrap">
              <button 
                onClick={() => setActiveTab('order')}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'order' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                點餐系統
              </button>
              <button 
                onClick={() => setActiveTab('manage')}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'manage' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <Wallet className="w-4 h-4" />
                儲值結算
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'menu' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                餐點管理
              </button>
            </nav>
            <button 
              onClick={handleLogout}
              className="p-3 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-xl transition-all active:scale-90 flex-shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {activeTab === 'order' ? (
          <>
            {/* Week Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateWeek(-1)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-all active:scale-75 text-gray-500 border border-transparent hover:border-gray-200"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="px-8 text-center border-x border-gray-100">
                  <span className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mb-1 block">本週期間</span>
                  <div className="text-lg font-black text-gray-900">
                    {weekDates[0].dateStr.split('-').slice(1).join('/')} - {weekDates[4].dateStr.split('-').slice(1).join('/')}
                  </div>
                </div>
                <button 
                  onClick={() => navigateWeek(1)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-all active:scale-75 text-gray-500 border border-transparent hover:border-gray-200"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-[#e8f0fe] rounded-xl text-[#0b57d0] text-sm font-black uppercase tracking-widest">
                  <Info className="w-4 h-4" />
                  點擊格子即可點餐
                </div>
              </div>
            </div>

            {/* Calendar Table */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-100">
                      <th className="sticky left-0 z-20 bg-[#f8f9fa] px-8 py-5 text-left font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] min-w-[140px]">
                        同事姓名
                      </th>
                      {weekDates.map(wd => (
                        <th key={wd.dateStr} className="px-6 py-5 border-l border-gray-100 min-w-[200px]">
                          <div className="text-[#0b57d0] font-black text-lg">{wd.label}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{wd.dateStr}</div>
                        </th>
                      ))}
                      <th className="px-8 py-5 bg-gray-50 font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase min-w-[140px]">
                        本週小計
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, index) => {
                      const userTotal = getUserWeeklyTotal(user);
                      return (
                        <tr key={user.userName} className="group hover:bg-blue-50/10 transition-colors">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#fcfdfe] border-r border-gray-50 px-8 py-6 font-black text-gray-800 text-lg shadow-[4px_0_8px_rgba(0,0,0,0.02)] whitespace-nowrap">
                            <span className="text-gray-300 mr-2 text-sm font-bold">#{index + 1}</span>
                            {user.userName}
                          </td>
                          {weekDates.map(wd => {
                            const dayOrder = user.selections[wd.dateStr];
                            const itemsOrdered = Object.entries((dayOrder || {})).filter(([_, count]) => (count as number) > 0);
                            
                            return (
                              <td key={wd.dateStr} className="p-3 border-r border-gray-50 align-top">
                                <button 
                                  onClick={() => setModalData({ userName: user.userName, dateStr: wd.dateStr, label: wd.label })}
                                  className={`
                                    w-full min-h-[72px] rounded-2xl p-3 text-left transition-all flex flex-col gap-1.5 border-2
                                    ${itemsOrdered.length > 0 
                                      ? 'bg-[#e8f0fe] border-[#0b57d0] shadow-sm transform scale-[1.02]' 
                                      : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  {itemsOrdered.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {itemsOrdered.map(([id, count]) => {
                                        const item = menuItems.find(m => m.id === id);
                                        if (!item) return null;
                                        return (
                                          <div key={id} className="flex items-center gap-2 text-xs font-black text-[#0b57d0]">
                                            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                            <span>{item.name} <span className="text-[10px] opacity-70">x</span>{count}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="m-auto text-gray-300 text-[10px] font-black uppercase tracking-widest opacity-40">點擊點餐</div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-8 py-6 text-center">
                            <div className={`
                              inline-flex items-center justify-center min-w-[70px] px-4 py-1.5 rounded-full text-sm font-black
                              ${userTotal > 0 ? 'bg-[#e6f4ea] text-[#137333] shadow-sm' : 'bg-gray-100 text-gray-400 opacity-60'}
                            `}>
                              ${userTotal}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ordering Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-[#fef7e0] rounded-2xl text-[#f29900] shadow-sm">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">廠商出貨統計表</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {stats.dailyStats.map(day => (
                    <div key={day.dateStr} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                      <div className="text-center mb-4">
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">{day.dateStr}</div>
                        <div className="font-black text-gray-800 text-base">{day.label}</div>
                      </div>
                      <div className="space-y-3.5 flex-grow">
                        {menuItems.map(item => {
                          const count = Number((day.itemCounts as any)[item.id] || 0);
                          return (
                            <div key={item.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2.5">
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                <span className="text-[11px] font-bold text-gray-500">{item.name}</span>
                              </div>
                              <span className={`text-sm font-black ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">合計</span>
                        <span className="text-sm font-black text-gray-900">${day.dailyTotal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1a1c1e] rounded-[2rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Calculator className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                  <div className="text-[#8ab4f8] font-black text-xs uppercase tracking-[0.3em] mb-2">Weekly Summary</div>
                  <h2 className="text-2xl font-black mb-10">本週應付廠商總額</h2>
                  <div className="flex items-baseline gap-2 mb-10">
                    <span className="text-3xl font-black text-[#8ab4f8]">$</span>
                    <span className="text-6xl font-black tracking-tighter">{stats.weeklyGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="w-2.5 h-2.5 bg-[#8ab4f8] rounded-full animate-pulse shadow-[0_0_12px_#8ab4f8]"></div>
                  <span className="text-xs font-bold text-gray-300">資料已同步至結算中心</span>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'manage' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* MANAGEMENT TAB HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] p-4 rounded-3xl shadow-lg shadow-blue-100">
                  <RefreshCcw className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">儲值與結算中心</h2>
                  <p className="text-gray-400 font-bold text-sm">每週結算後餘額將自動結轉至下週</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setUserModal({ mode: 'add', currentName: '' })}
                  className="group flex items-center gap-3 bg-white text-[#0b57d0] border-2 border-blue-100 px-6 py-4 rounded-2xl font-black hover:bg-[#0b57d0] hover:text-white hover:border-[#0b57d0] transition-all active:scale-95 text-lg shadow-lg shadow-blue-50"
                >
                  <UserPlus className="w-6 h-6" />
                  新增同事
                </button>
                <button 
                  onClick={triggerSettlement}
                  className="group flex items-center gap-3 bg-white text-[#d93025] border-2 border-red-100 px-8 py-4 rounded-2xl font-black hover:bg-[#d93025] hover:text-white hover:border-[#d93025] transition-all active:scale-95 text-lg shadow-xl shadow-red-50"
                >
                  <Trash2 className="w-6 h-6 group-hover:animate-bounce" />
                  清除當週資料 (結算)
                </button>
              </div>
            </div>

            {/* Management Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="bg-[#e8f0fe] p-4 rounded-2xl text-[#0b57d0] shadow-sm">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">目前總儲值額</div>
                  <div className="text-3xl font-black text-gray-900 tracking-tight">${users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="bg-[#fef7e0] p-4 rounded-2xl text-[#f29900] shadow-sm">
                  <TrendingDown className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">本週預計支出</div>
                  <div className="text-3xl font-black text-gray-900 tracking-tight">${stats.weeklyGrandTotal.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="bg-[#e6f4ea] p-4 rounded-2xl text-[#1e8e3e] shadow-sm">
                  <ArrowUpRight className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">結算後總餘額</div>
                  <div className="text-3xl font-black text-[#1e8e3e] tracking-tight">${(users.reduce((sum, u) => sum + u.balance, 0) - stats.weeklyGrandTotal).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Management Table */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-10 py-6 border-b border-gray-100 bg-[#fafafa] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <History className="text-gray-400 w-6 h-6" />
                  <h2 className="text-lg font-black text-gray-800 tracking-wide uppercase">同事帳戶清單</h2>
                </div>
                <div className="bg-[#0b57d0]/5 text-[#0b57d0] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Live Settlement Center
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-10 py-5 text-left font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">同事姓名</th>
                      <th className="px-8 py-5 text-right font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">本週花費</th>
                      <th className="px-8 py-5 text-center font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">儲值操作</th>
                      <th className="px-8 py-5 text-right font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">目前儲值金</th>
                      <th className="px-8 py-5 text-right font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">結算後預計</th>
                      <th className="px-10 py-5 text-center font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, index) => {
                      const weeklySpent = getUserWeeklyTotal(user);
                      const finalBalance = user.balance - weeklySpent;
                      return (
                        <tr key={user.userName} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-10 py-6 font-black text-gray-800 text-lg whitespace-nowrap">
                            <span className="text-gray-300 mr-2 text-sm font-bold">#{index + 1}</span>
                            {user.userName}
                          </td>
                          <td className="px-8 py-6 text-right whitespace-nowrap">
                            <span className={`font-black text-base ${weeklySpent > 0 ? 'text-[#d93025]' : 'text-gray-300 opacity-50'}`}>
                              ${weeklySpent}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center whitespace-nowrap">
                            <button 
                              onClick={() => setRechargeModal({ userName: user.userName, currentBalance: user.balance })}
                              className="inline-flex items-center gap-2 bg-white text-[#0b57d0] border-2 border-blue-50 px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-[#0b57d0] hover:text-white hover:border-[#0b57d0] shadow-sm transition-all active:scale-95 whitespace-nowrap"
                            >
                              <PlusCircle className="w-4 h-4" />
                              儲值
                            </button>
                          </td>
                          <td className="px-8 py-6 text-right font-black text-gray-600 text-base whitespace-nowrap">${user.balance}</td>
                          <td className="px-8 py-6 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center px-5 py-2 rounded-2xl text-sm font-black shadow-sm ${finalBalance >= 0 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#d93025] animate-pulse'}`}>
                              ${finalBalance}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => setUserModal({ mode: 'edit', oldName: user.userName, currentName: user.userName })}
                                className="p-2.5 text-gray-400 hover:text-[#0b57d0] hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                title="修改名稱"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => triggerDeleteUser(user.userName)}
                                className="p-2.5 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                title="刪除同事"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-10 bg-[#e8f0fe] p-8 rounded-[2rem] border border-[#0b57d0]/10 flex items-start gap-6 shadow-sm">
              <div className="bg-white p-3 rounded-2xl text-[#0b57d0] shadow-sm">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0b57d0] mb-2 tracking-tight">結算與自動化管理說明</h3>
                <p className="text-sm text-[#0b57d0]/80 font-medium leading-relaxed max-w-3xl">
                  結算流程如下：<br />
                  1. 點擊 <span className="font-black text-[#d93025]">『清除當週資料 (結算)』</span>。<br />
                  2. 系統會自動計算：<span className="font-black">結算後餘額 = 目前儲值金 - 本週花費</span>。<br />
                  3. 此餘額將成為下週的起始儲值金，並清空點餐資料。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* MENU MANAGEMENT TAB HEADER */}
             <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] p-4 rounded-3xl shadow-lg shadow-blue-100">
                  <UtensilsCrossed className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">餐點管理系統</h2>
                  <p className="text-gray-400 font-bold text-sm">修改餐點名稱與定價，即時同步至所有點餐介面</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className={`absolute -top-6 -right-6 opacity-5 group-hover:scale-110 transition-transform duration-700 ${item.color}`}>
                    <item.icon className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-5 rounded-3xl bg-gray-50 mb-6 group-hover:bg-white group-hover:shadow-md transition-all ${item.color}`}>
                      <item.icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{item.name}</h3>
                    <div className="text-3xl font-black text-[#0b57d0] mb-8">${item.price}</div>
                    
                    <button 
                      onClick={() => setMenuEditModal({...item})}
                      className="w-full flex items-center justify-center gap-3 bg-[#e8f0fe] text-[#0b57d0] py-4 rounded-2xl font-black text-sm hover:bg-[#0b57d0] hover:text-white transition-all active:scale-95"
                    >
                      <Pencil className="w-4 h-4" />
                      編輯內容
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex items-center gap-5 mb-6">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">重要提示</h3>
               </div>
               <p className="text-gray-500 font-medium leading-relaxed">
                 修改餐點價格將會立即影響「本週小計」的計算。若本週已經有點餐紀錄，修改後的價格將會套用到本週所有的點餐數量上，請謹慎操作。建議於每週結算後、新一週開始前進行菜單調整。
               </p>
            </div>
          </div>
        )}

      </main>

      {/* MODALS SECTION */}

      {/* Menu Edit Modal */}
      {menuEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Pencil className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">編輯餐點</h3>
                  <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mt-1 whitespace-nowrap">Menu Configuration</div>
                </div>
              </div>
              <button 
                onClick={() => setMenuEditModal(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-400"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
            <form onSubmit={handleMenuUpdate} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 ml-1">餐點名稱</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={menuEditModal.name}
                  onChange={e => setMenuEditModal({ ...menuEditModal, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] focus:ring-4 focus:ring-[#0b57d0]/10 outline-none transition-all text-gray-900 font-bold text-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 ml-1">單價 ($)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={menuEditModal.price}
                  onChange={e => setMenuEditModal({ ...menuEditModal, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] focus:ring-4 focus:ring-[#0b57d0]/10 outline-none transition-all text-gray-900 font-bold text-lg"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setMenuEditModal(null)}
                  className="flex-1 py-5 rounded-2xl bg-gray-50 text-gray-500 font-black hover:bg-gray-100 transition-all active:scale-95 whitespace-nowrap"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 rounded-2xl bg-[#0b57d0] text-white font-black shadow-xl shadow-blue-100 hover:bg-[#0842a0] transition-all active:scale-95 whitespace-nowrap"
                >
                  確認修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Modal (Add/Edit) */}
      {userModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  {userModal.mode === 'add' ? <UserPlus className="w-7 h-7" /> : <Pencil className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
                    {userModal.mode === 'add' ? '新增同事' : '修改資料'}
                  </h3>
                  <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mt-1 whitespace-nowrap">Colleague Management</div>
                </div>
              </div>
              <button 
                onClick={() => setUserModal(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-400"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
            <form onSubmit={handleUserAction} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 ml-1">同事姓名</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={userModal.currentName}
                  onChange={e => setUserModal({ ...userModal, currentName: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] focus:ring-4 focus:ring-[#0b57d0]/10 outline-none transition-all text-gray-900 font-bold placeholder-gray-300 text-lg whitespace-nowrap"
                  placeholder="請輸入姓名"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setUserModal(null)}
                  className="flex-1 py-5 rounded-2xl bg-gray-50 text-gray-500 font-black hover:bg-gray-100 transition-all active:scale-95 whitespace-nowrap"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 rounded-2xl bg-[#0b57d0] text-white font-black shadow-xl shadow-blue-100 hover:bg-[#0842a0] transition-all active:scale-95 whitespace-nowrap"
                >
                  {userModal.mode === 'add' ? '確認新增' : '儲存修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Replacement for native confirm()) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-[#d93025]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 whitespace-nowrap">{confirmDialog.title}</h3>
              <p className="text-gray-500 font-bold leading-relaxed mb-10">{confirmDialog.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-5 rounded-2xl bg-gray-50 text-gray-500 font-black hover:bg-gray-100 transition-all active:scale-95 whitespace-nowrap"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-5 rounded-2xl bg-[#d93025] text-white font-black shadow-xl shadow-red-100 hover:bg-[#b21f16] transition-all active:scale-95 whitespace-nowrap"
                >
                  確定執行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal (Replacement for native alert()) */}
      {notification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className={`w-20 h-20 ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                {notification.type === 'success' ? <Check className="w-10 h-10 text-green-600" /> : <X className="w-10 h-10 text-red-600" />}
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 whitespace-nowrap">{notification.title}</h3>
              <p className="text-gray-500 font-bold leading-relaxed mb-10">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="w-full py-5 rounded-2xl bg-[#0b57d0] text-white font-black shadow-xl shadow-blue-100 hover:bg-[#0842a0] transition-all active:scale-95 whitespace-nowrap"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#1a1c1e]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">{modalData.userName}</h3>
                  <div className="flex items-center gap-2.5 text-[#0b57d0] font-black text-xs uppercase tracking-[0.15em] mt-1 whitespace-nowrap">
                    <Calendar className="w-4 h-4" />
                    {modalData.label} • {modalData.dateStr}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setModalData(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-400"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="p-10 space-y-5">
              {menuItems.map(item => {
                const count = currentSelections[item.id] || 0;
                return (
                  <div 
                    key={item.id} 
                    className={`
                      flex items-center justify-between p-4 rounded-[1.75rem] transition-all border-2
                      ${count > 0 ? 'bg-[#e8f0fe] border-[#0b57d0] shadow-sm' : 'bg-white border-gray-100'}
                    `}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-3.5 rounded-2xl ${count > 0 ? 'bg-white shadow-md' : 'bg-gray-50'}`}>
                        <item.icon className={`w-7 h-7 ${item.color}`} />
                      </div>
                      <div>
                        <div className="text-lg font-black text-gray-800 whitespace-nowrap">{item.name}</div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">${item.price}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
                      <button 
                        onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, -1)}
                        className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${count > 0 ? 'bg-white text-gray-700 shadow-sm hover:text-[#d93025] active:scale-90' : 'text-gray-300 pointer-events-none'}`}
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className={`w-8 text-center text-lg font-black ${count > 0 ? 'text-[#0b57d0]' : 'text-gray-400'} whitespace-nowrap`}>
                        {count}
                      </span>
                      <button 
                        onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, 1)}
                        className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-700 hover:text-[#0b57d0] active:scale-90 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-10 pb-12 pt-2 flex flex-col gap-5">
              <div className="flex justify-between items-center px-8 py-5 bg-[#1a1c1e] rounded-[1.75rem] text-white shadow-xl">
                <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">當日應付小計</span>
                <span className="text-3xl font-black text-[#8ab4f8] whitespace-nowrap">
                  ${menuItems.reduce((sum, item) => sum + (currentSelections[item.id] || 0) * item.price, 0)}
                </span>
              </div>
              <button 
                onClick={() => setModalData(null)}
                className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-black py-5 rounded-[1.75rem] shadow-lg transform active:scale-[0.97] transition-all text-lg flex items-center justify-center gap-3 tracking-wide whitespace-nowrap"
              >
                <Check className="w-6 h-6" />
                確認點餐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {rechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1a1c1e]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-500"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">儲值帳戶</h3>
                  <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mt-1 whitespace-nowrap">{rechargeModal.userName}</div>
                </div>
              </div>
              <button 
                onClick={() => { setRechargeModal(null); setCustomAmount(''); }}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-400"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleRechargeSubmit} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">快速預設金額 (點擊加總)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[100, 500, 1000].map(amt => (
                    <button 
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAdd(amt)}
                      className="py-4 rounded-2xl font-black text-sm transition-all border-2 active:scale-95 bg-gray-50 border-transparent text-gray-600 hover:border-[#0b57d0] hover:bg-[#e8f0fe] hover:text-[#0b57d0] whitespace-nowrap"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 whitespace-nowrap">自訂儲值金額 (加減 $100)</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-2xl group-focus-within:text-[#0b57d0] transition-colors">$</span>
                  <input 
                    type="number" 
                    autoFocus
                    value={customAmount}
                    step="100"
                    min="0"
                    onChange={e => setCustomAmount(Math.max(0, parseInt(e.target.value) || 0).toString())}
                    className="w-full pl-14 pr-14 py-6 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 focus:border-[#0b57d0] focus:ring-8 focus:ring-[#0b57d0]/5 outline-none transition-all font-black text-3xl placeholder:text-gray-200 shadow-sm whitespace-nowrap"
                    placeholder="0"
                  />
                  {customAmount && (
                    <button 
                      type="button" 
                      onClick={() => setCustomAmount('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-[#f3f4f9] rounded-3xl p-7 border border-gray-100 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">
                  <span className="whitespace-nowrap">帳戶餘額變動預覽</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 whitespace-nowrap">目前</span>
                    <div className="text-xl font-black text-gray-500 tracking-tight whitespace-nowrap">${rechargeModal.currentBalance}</div>
                  </div>
                  <Plus className="w-5 h-5 text-gray-300" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 whitespace-nowrap">增加</span>
                    <div className="text-xl font-black text-[#0b57d0] tracking-tight whitespace-nowrap">${customAmount || '0'}</div>
                  </div>
                  <div className="w-8 h-px bg-gray-200 mx-2"></div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-[#1e8e3e] uppercase tracking-wider mb-1 whitespace-nowrap">結算後</span>
                    <div className="text-3xl font-black text-[#1e8e3e] tracking-tighter whitespace-nowrap">
                      ${rechargeModal.currentBalance + (parseInt(customAmount) || 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => { setRechargeModal(null); setCustomAmount(''); }}
                  className="flex-1 px-4 py-5 rounded-[1.5rem] border-2 border-gray-100 bg-white text-gray-500 font-black text-base hover:bg-gray-50 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={!customAmount || isNaN(parseInt(customAmount)) || parseInt(customAmount) === 0}
                  className="flex-1 px-4 py-5 rounded-[1.75rem] bg-[#0b57d0] text-white font-black text-base shadow-xl shadow-[#0b57d0]/20 hover:bg-[#0842a0] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none whitespace-nowrap"
                >
                  確認儲值
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Footer info */}
      <footer className="text-center py-12 text-gray-400">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">Office Catering Management System</div>
        <p className="text-[11px] font-black px-6 opacity-40">資料儲存於瀏覽器 Local Storage</p>
      </footer>
    </div>
  );
}
