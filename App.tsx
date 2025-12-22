
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  UtensilsCrossed,
  CloudCheck,
  CloudDownload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

/** 
 * FIREBASE CONFIGURATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyDNgjQKbaZU8KQBw5g6MJM0dgsHLpieG3g",
  authDomain: "bento2-faa19.firebaseapp.com",
  projectId: "bento2-faa19",
  storageBucket: "bento2-faa19.firebasestorage.app",
  messagingSenderId: "932512319676",
  appId: "1:932512319676:web:aebed31d4dd3f0e6eb28b9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** 
 * CONSTANTS & TYPES 
 */

const DEFAULT_MENU_ITEMS = [
  { id: 'bento', name: '便當', price: 90, icon: Package, color: 'text-orange-600' },
  { id: 'riceNoodle', name: '米粉', price: 80, icon: Waves, color: 'text-blue-500' },
  { id: 'friedNoodle', name: '炒麵', price: 80, icon: Flame, color: 'text-red-600' },
  { id: 'dumplings', name: '水餃', price: 70, icon: CircleDot, color: 'text-emerald-600' },
] as const;

interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon?: any;
  color: string;
}

interface DailyOrder {
  [key: string]: number;
}

interface UserData {
  userName: string;
  balance: number;
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([...DEFAULT_MENU_ITEMS]);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Refs for tracking changes to prevent infinite loops with Firebase
  const isInitialLoad = useRef(true);

  // Cloud Sync Logic
  useEffect(() => {
    // 1. Fetch Menu
    const menuUnsub = onSnapshot(doc(db, 'settings', 'menu'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().items;
        setMenuItems(data.map((item: any) => ({
          ...item,
          icon: DEFAULT_MENU_ITEMS.find(d => d.id === item.id)?.icon || Package
        })));
      }
    });

    // 2. Fetch Users
    const usersUnsub = onSnapshot(doc(db, 'data', 'users'), (docSnap) => {
      if (docSnap.exists()) {
        setUsers(docSnap.data().list);
      } else {
        // Fallback to initial if Firestore is empty
        const initial = INITIAL_NAMES.map(name => ({
          userName: name,
          balance: 0,
          selections: {}
        }));
        setUsers(initial);
      }
      setIsLoading(false);
    });

    return () => {
      menuUnsub();
      usersUnsub();
    };
  }, []);

  // Save to Cloud when state changes (Debounced)
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'data', 'users'), { list: users });
        // Don't save full icon objects to Firestore, just basic info
        const menuToSave = menuItems.map(({ icon, ...rest }) => rest);
        await setDoc(doc(db, 'settings', 'menu'), { items: menuToSave });
      } catch (e) {
        console.error("Cloud sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [users, menuItems, isLoading]);

  // Modal States
  const [modalData, setModalData] = useState<{ userName: string, dateStr: string, label: string } | null>(null);
  const [rechargeModal, setRechargeModal] = useState<{ userName: string, currentBalance: number } | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [userModal, setUserModal] = useState<{ mode: 'add' | 'edit', oldName?: string, currentName: string } | null>(null);
  const [menuEditModal, setMenuEditModal] = useState<MenuItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ title: string, message: string, type: 'success' | 'error' } | null>(null);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));

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
      const newVal = Math.max(0, (currentDay[itemId] || 0) + delta);
      if (newVal === 0) delete currentDay[itemId]; else currentDay[itemId] = newVal;
      if (Object.keys(currentDay).length === 0) delete newSelections[dateStr]; else newSelections[dateStr] = currentDay;
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

  const triggerSettlement = () => {
    setConfirmDialog({
      title: '!!! 請注意 !!!',
      message: '是否確定要執行本週結算？這將會扣除每位同事的本週餐費並歸零訂單。',
      onConfirm: () => {
        setUsers(prev => prev.map(user => ({ 
          ...user, 
          balance: user.balance - getUserWeeklyTotal(user),
          selections: {} 
        })));
        setConfirmDialog(null);
        setNotification({ title: '成功結算!', message: '目前的訂餐表已清除，帳戶餘額已即時同步到雲端!', type: 'success' });
      }
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
    } else {
      setUsers(prev => prev.map(u => u.userName === userModal.oldName ? { ...u, userName: name } : u));
    }
    setUserModal(null);
  };

  const triggerDeleteUser = (name: string) => {
    setConfirmDialog({
      title: '刪除人員確認',
      message: `確定要移除「${name}」嗎？此操作將同步至所有同事的畫面。`,
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
    setNotification({ title: '成功', message: '餐點資訊已更新至雲端!', type: 'success' });
  };

  const navigateWeek = (weeks: number) => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (weeks * 7));
      return d;
    });
  };

  /**
   * STATS
   */
  const stats = useMemo(() => {
    const dailyStats = weekDates.map(wd => {
      const itemCounts: Record<string, number> = {};
      let dailyTotal = 0;
      menuItems.forEach(item => {
        let count = 0;
        users.forEach(user => { count += (user.selections[wd.dateStr]?.[item.id] || 0); });
        itemCounts[item.id] = count;
        dailyTotal += count * item.price;
      });
      return { dateStr: wd.dateStr, label: wd.label, itemCounts, dailyTotal };
    });
    return { dailyStats, weeklyGrandTotal: dailyStats.reduce((sum, day) => sum + day.dailyTotal, 0) };
  }, [users, weekDates, menuItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f9] gap-4">
        <div className="w-12 h-12 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#0b57d0] font-black tracking-widest uppercase text-xs animate-pulse">正在連接 Firebase 雲端...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9] p-4">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="bg-[#e8f0fe] w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <ClipboardList className="text-[#0b57d0] w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">辦公室訂餐系統</h1>
            <p className="text-gray-500 mt-2 font-medium">Firebase Cloud Sync Enabled</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">管理帳號</label>
              <input type="text" value={loginForm.id} onChange={e => setLoginForm({...loginForm, id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] outline-none transition-all font-bold" placeholder="bento" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">管理密碼</label>
              <input type="password" value={loginForm.pwd} onChange={e => setLoginForm({...loginForm, pwd: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white focus:border-[#0b57d0] outline-none transition-all font-bold" placeholder="bento" />
            </div>
            {loginError && <div className="bg-[#fce8e6] text-[#d93025] p-4 rounded-2xl text-sm flex items-center gap-3 border border-[#f5c2c7]"><AlertCircle className="w-5 h-5" /><span className="font-bold">{loginError}</span></div>}
            <button type="submit" className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-black py-4 rounded-2xl shadow-lg transition-all text-lg">登入系統</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f9] flex flex-col pb-10">
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#0b57d0] p-2.5 rounded-xl shadow-md">
              <Calendar className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                訂餐管理中心
                {isSyncing ? <RefreshCcw className="w-3.5 h-3.5 text-gray-400 animate-spin" /> : <CloudCheck className="w-3.5 h-3.5 text-green-400" />}
              </h1>
              <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.15em]">Synced with Firebase Firestore</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex bg-gray-100/80 p-1.5 rounded-2xl mr-2 no-scrollbar overflow-x-auto whitespace-nowrap">
              <button onClick={() => setActiveTab('order')} className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'order' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500'}`}><LayoutDashboard className="w-4 h-4" />點餐</button>
              <button onClick={() => setActiveTab('manage')} className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'manage' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500'}`}><Wallet className="w-4 h-4" />結算</button>
              <button onClick={() => setActiveTab('menu')} className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'menu' ? 'bg-white shadow-md text-[#0b57d0]' : 'text-gray-500'}`}><UtensilsCrossed className="w-4 h-4" />菜單</button>
            </nav>
            <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-xl transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-8">
        {activeTab === 'order' && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-5 rounded-[1.5rem] border border-gray-100">
              <div className="flex items-center gap-3">
                <button onClick={() => navigateWeek(-1)} className="p-3 hover:bg-gray-100 rounded-xl"><ChevronLeft className="w-6 h-6" /></button>
                <div className="px-8 text-center border-x border-gray-100">
                  <span className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mb-1 block">本週期間</span>
                  <div className="text-lg font-black text-gray-900">{weekDates[0].dateStr.split('-').slice(1).join('/')} - {weekDates[4].dateStr.split('-').slice(1).join('/')}</div>
                </div>
                <button onClick={() => navigateWeek(1)} className="p-3 hover:bg-gray-100 rounded-xl"><ChevronRight className="w-6 h-6" /></button>
              </div>
              <div className="bg-[#e8f0fe] px-6 py-3 rounded-xl text-[#0b57d0] text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <CloudDownload className="w-4 h-4" />
                雲端即時同步中
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-100">
                      <th className="sticky left-0 z-20 bg-[#f8f9fa] px-10 py-5 text-left font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] min-w-[140px]">同事姓名</th>
                      {weekDates.map(wd => (
                        <th key={wd.dateStr} className="px-6 py-5 border-l border-gray-100 min-w-[200px]">
                          <div className="text-[#0b57d0] font-black text-lg">{wd.label}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{wd.dateStr}</div>
                        </th>
                      ))}
                      <th className="px-8 py-5 bg-gray-50 font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase min-w-[140px]">本週小計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, idx) => {
                      const userTotal = getUserWeeklyTotal(user);
                      return (
                        <tr key={user.userName} className="group hover:bg-blue-50/10">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#fcfdfe] px-10 py-6 font-black text-gray-800 text-lg whitespace-nowrap"><span className="text-gray-300 mr-2 text-sm">#{idx + 1}</span>{user.userName}</td>
                          {weekDates.map(wd => {
                            const dayOrder = user.selections[wd.dateStr];
                            const ordered = Object.entries(dayOrder || {}).filter(([_, c]) => c > 0);
                            return (
                              <td key={wd.dateStr} className="p-3 border-r border-gray-50">
                                <button onClick={() => setModalData({ userName: user.userName, dateStr: wd.dateStr, label: wd.label })} className={`w-full min-h-[72px] rounded-2xl p-3 text-left transition-all flex flex-col gap-1 border-2 ${ordered.length > 0 ? 'bg-[#e8f0fe] border-[#0b57d0]' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                  {ordered.length > 0 ? ordered.map(([id, c]) => {
                                    const item = menuItems.find(m => m.id === id);
                                    return item ? <div key={id} className="flex items-center gap-2 text-xs font-black text-[#0b57d0]"><item.icon className={`w-3.5 h-3.5 ${item.color}`} /><span>{item.name} x{c}</span></div> : null;
                                  }) : <div className="m-auto text-gray-300 text-[10px] font-black uppercase tracking-widest opacity-40">點餐</div>}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-8 py-6 text-center">
                            <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-black ${userTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>${userTotal}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shadow-sm"><ClipboardList className="w-6 h-6" /></div>
                  <h2 className="text-xl font-black text-gray-900">雲端出貨統計表 (實時)</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {stats.dailyStats.map(day => (
                    <div key={day.dateStr} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col">
                      <div className="text-center mb-4"><div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{day.dateStr}</div><div className="font-black text-gray-800 text-base">{day.label}</div></div>
                      <div className="space-y-3 flex-grow">
                        {menuItems.map(item => {
                          const count = day.itemCounts[item.id] || 0;
                          return <div key={item.id} className="flex justify-between items-center"><div className="flex items-center gap-2"><item.icon className={`w-4 h-4 ${item.color}`} /><span className="text-[11px] font-bold text-gray-500">{item.name}</span></div><span className={`text-sm font-black ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{count}</span></div>;
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center"><span className="text-[10px] font-black text-gray-400">合計</span><span className="text-sm font-black text-gray-900">${day.dailyTotal}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 bg-[#1a1c1e] rounded-[2rem] p-10 text-white flex flex-col justify-between shadow-2xl overflow-hidden relative group">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700"><Calculator className="w-48 h-48" /></div>
                <div className="relative z-10"><div className="text-[#8ab4f8] font-black text-xs uppercase tracking-[0.3em] mb-2">Cloud Real-time Total</div><h2 className="text-2xl font-black mb-10">本週應付廠商總額</h2><div className="flex items-baseline gap-2 mb-10"><span className="text-3xl font-black text-[#8ab4f8]">$</span><span className="text-6xl font-black tracking-tighter">{stats.weeklyGrandTotal.toLocaleString()}</span></div></div>
                <div className="relative z-10 flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><div className="w-2.5 h-2.5 bg-[#8ab4f8] rounded-full animate-pulse shadow-[0_0_12px_#8ab4f8]"></div><span className="text-xs font-bold text-gray-300">資料已同步至所有設備</span></div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'manage' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] p-4 rounded-3xl shadow-lg"><RefreshCcw className="text-white w-8 h-8" /></div>
                <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">儲值與雲端結算</h2><p className="text-gray-400 font-bold text-sm">異動將自動同步至所有同事介面</p></div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setUserModal({ mode: 'add', currentName: '' })} className="flex items-center gap-3 bg-white text-[#0b57d0] border-2 border-blue-100 px-6 py-4 rounded-2xl font-black hover:bg-[#0b57d0] hover:text-white transition-all text-lg shadow-lg"><UserPlus className="w-6 h-6" />新增同事</button>
                <button onClick={triggerSettlement} className="flex items-center gap-3 bg-white text-[#d93025] border-2 border-red-100 px-8 py-4 rounded-2xl font-black hover:bg-[#d93025] hover:text-white transition-all text-lg shadow-xl"><Trash2 className="w-6 h-6" />清除當週 (結算)</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center gap-6"><div className="bg-[#e8f0fe] p-4 rounded-2xl text-[#0b57d0]"><Wallet className="w-8 h-8" /></div><div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">總儲值額</div><div className="text-3xl font-black text-gray-900 tracking-tight">${users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}</div></div></div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center gap-6"><div className="bg-[#fef7e0] p-4 rounded-2xl text-amber-500"><TrendingDown className="w-8 h-8" /></div><div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">本週支出</div><div className="text-3xl font-black text-gray-900 tracking-tight">${stats.weeklyGrandTotal.toLocaleString()}</div></div></div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center gap-6"><div className="bg-[#e6f4ea] p-4 rounded-2xl text-green-600"><ArrowUpRight className="w-8 h-8" /></div><div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">結算後餘額</div><div className="text-3xl font-black text-green-600 tracking-tight">${(users.reduce((sum, u) => sum + u.balance, 0) - stats.weeklyGrandTotal).toLocaleString()}</div></div></div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-gray-100">
                      <th className="px-10 py-5 text-left font-black text-gray-400 text-[10px] tracking-widest uppercase">同事姓名</th>
                      <th className="px-8 py-5 text-right font-black text-gray-400 text-[10px] tracking-widest uppercase">本週花費</th>
                      <th className="px-8 py-5 text-center font-black text-gray-400 text-[10px] tracking-widest uppercase">儲值操作</th>
                      <th className="px-8 py-5 text-right font-black text-gray-400 text-[10px] tracking-widest uppercase">餘額</th>
                      <th className="px-10 py-5 text-center font-black text-gray-400 text-[10px] tracking-widest uppercase">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, idx) => {
                      const spent = getUserWeeklyTotal(user);
                      const future = user.balance - spent;
                      return (
                        <tr key={user.userName} className="hover:bg-gray-50 transition-colors">
                          <td className="px-10 py-6 font-black text-gray-800 text-lg whitespace-nowrap"><span className="text-gray-300 mr-2 text-sm">#{idx + 1}</span>{user.userName}</td>
                          <td className="px-8 py-6 text-right whitespace-nowrap"><span className={`font-black text-base ${spent > 0 ? 'text-[#d93025]' : 'text-gray-300'}`}>${spent}</span></td>
                          <td className="px-8 py-6 text-center whitespace-nowrap"><button onClick={() => setRechargeModal({ userName: user.userName, currentBalance: user.balance })} className="bg-white text-[#0b57d0] border-2 border-blue-50 px-6 py-2 rounded-2xl font-black text-sm hover:bg-[#0b57d0] hover:text-white transition-all shadow-sm"><PlusCircle className="w-4 h-4 mr-2 inline" />儲值</button></td>
                          <td className="px-8 py-6 text-right whitespace-nowrap"><span className={`inline-flex px-5 py-2 rounded-2xl text-sm font-black ${future >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700 animate-pulse'}`}>${user.balance} &rarr; ${future}</span></td>
                          <td className="px-10 py-6 text-center whitespace-nowrap"><div className="flex justify-center gap-2"><button onClick={() => setUserModal({ mode: 'edit', oldName: user.userName, currentName: user.userName })} className="p-2.5 text-gray-400 hover:text-[#0b57d0] hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button><button onClick={() => triggerDeleteUser(user.userName)} className="p-2.5 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-xl transition-all"><UserMinus className="w-4 h-4" /></button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] p-4 rounded-3xl shadow-lg"><UtensilsCrossed className="text-white w-8 h-8" /></div>
                <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">雲端菜單配置</h2><p className="text-gray-400 font-bold text-sm">修改後即時同步至所有點餐介面</p></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className={`absolute -top-6 -right-6 opacity-5 group-hover:scale-110 transition-transform duration-700 ${item.color}`}><item.icon className="w-32 h-32" /></div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-5 rounded-3xl bg-gray-50 mb-6 group-hover:bg-white group-hover:shadow-md transition-all ${item.color}`}><item.icon className="w-10 h-10" /></div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{item.name}</h3>
                    <div className="text-3xl font-black text-[#0b57d0] mb-8">${item.price}</div>
                    <button onClick={() => setMenuEditModal({...item})} className="w-full bg-[#e8f0fe] text-[#0b57d0] py-4 rounded-2xl font-black text-sm hover:bg-[#0b57d0] hover:text-white transition-all"><Pencil className="w-4 h-4 mr-2 inline" />編輯</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {menuEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-8">編輯餐點內容</h3>
            <form onSubmit={handleMenuUpdate} className="space-y-6">
              <div className="space-y-2"><label className="text-sm font-bold text-gray-600">餐點名稱</label><input type="text" required value={menuEditModal.name} onChange={e => setMenuEditModal({...menuEditModal, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] font-bold" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-gray-600">單價 ($)</label><input type="number" required min="0" value={menuEditModal.price} onChange={e => setMenuEditModal({...menuEditModal, price: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] font-bold" /></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setMenuEditModal(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500">取消</button><button type="submit" className="flex-1 py-4 bg-[#0b57d0] text-white rounded-2xl font-black shadow-lg shadow-blue-100">儲存變更</button></div>
            </form>
          </div>
        </div>
      )}

      {userModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-8">{userModal.mode === 'add' ? '新增雲端同事' : '修改同事名稱'}</h3>
            <form onSubmit={handleUserAction} className="space-y-6">
              <div className="space-y-2"><label className="text-sm font-bold text-gray-600">同事姓名</label><input type="text" autoFocus required value={userModal.currentName} onChange={e => setUserModal({...userModal, currentName: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] font-bold" /></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setUserModal(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500">取消</button><button type="submit" className="flex-1 py-4 bg-[#0b57d0] text-white rounded-2xl font-black shadow-lg shadow-blue-100">{userModal.mode === 'add' ? '建立帳號' : '儲存修改'}</button></div>
            </form>
          </div>
        </div>
      )}

      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1a1c1e]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-4"><div className="bg-[#0b57d0] w-12 h-12 rounded-2xl flex items-center justify-center text-white"><User className="w-6 h-6" /></div><div><h3 className="text-xl font-black text-gray-900">{modalData.userName}</h3><div className="text-[#0b57d0] font-black text-[10px] uppercase tracking-widest">{modalData.label} • {modalData.dateStr}</div></div></div>
              <button onClick={() => setModalData(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-8 space-y-4">
              {menuItems.map(item => {
                const count = currentSelections[item.id] || 0;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${count > 0 ? 'bg-[#e8f0fe] border-[#0b57d0]' : 'bg-white border-gray-50'}`}>
                    <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-xl shadow-sm"><item.icon className={`w-6 h-6 ${item.color}`} /></div><div><div className="font-black text-gray-800">{item.name}</div><div className="text-[10px] font-bold text-gray-400">${item.price}</div></div></div>
                    <div className="flex items-center gap-3 bg-gray-100/50 p-1.5 rounded-xl">
                      <button onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, -1)} className={`w-10 h-10 flex items-center justify-center rounded-lg ${count > 0 ? 'bg-white shadow-sm text-gray-700' : 'text-gray-300 pointer-events-none'}`}><Minus className="w-4 h-4" /></button>
                      <span className="w-6 text-center font-black">{count}</span>
                      <button onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-700"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-8 pb-10 flex flex-col gap-4">
              <div className="flex justify-between items-center px-6 py-4 bg-[#1a1c1e] rounded-2xl text-white"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">當日小計</span><span className="text-2xl font-black text-[#8ab4f8]">${menuItems.reduce((s, i) => s + (currentSelections[i.id] || 0) * i.price, 0)}</span></div>
              <button onClick={() => setModalData(null)} className="w-full bg-[#0b57d0] py-4 rounded-2xl text-white font-black text-lg transition-all active:scale-[0.98]">確認點餐</button>
            </div>
          </div>
        </div>
      )}

      {rechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1a1c1e]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-2">帳戶儲值</h3>
            <div className="text-[#0b57d0] font-black text-[10px] uppercase tracking-widest mb-8">{rechargeModal.userName} • 雲端即時同步</div>
            <form onSubmit={handleRechargeSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[100, 500, 1000].map(amt => (
                  <button key={amt} type="button" onClick={() => setCustomAmount((a) => (parseInt(a) || 0) + amt + "")} className="py-4 bg-gray-50 border-2 border-transparent hover:border-[#0b57d0] rounded-2xl font-black text-gray-500 hover:text-[#0b57d0] transition-all">+${amt}</button>
                ))}
              </div>
              <div className="space-y-2 relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                <input type="number" autoFocus step="100" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="w-full pl-12 pr-6 py-5 rounded-2xl border-2 border-gray-200 outline-none focus:border-[#0b57d0] font-black text-3xl" placeholder="0" />
              </div>
              <div className="bg-[#f3f4f9] p-6 rounded-2xl flex justify-between items-center border border-gray-100">
                <div className="text-right flex flex-col"><span className="text-[10px] font-black text-gray-400">結算後預覽</span><span className="text-2xl font-black text-green-600">${rechargeModal.currentBalance + (parseInt(customAmount) || 0)}</span></div>
                <Plus className="w-4 h-4 text-gray-300" />
                <div className="text-left flex flex-col"><span className="text-[10px] font-black text-gray-400">目前餘額</span><span className="text-lg font-bold text-gray-500">${rechargeModal.currentBalance}</span></div>
              </div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setRechargeModal(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500">取消</button><button type="submit" disabled={!customAmount || parseInt(customAmount) <= 0} className="flex-1 py-4 bg-[#0b57d0] disabled:bg-gray-300 text-white rounded-2xl font-black shadow-lg shadow-blue-100">確認儲值</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert className="w-8 h-8 text-[#d93025]" /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{confirmDialog.title}</h3>
            <p className="text-gray-500 font-bold mb-10">{confirmDialog.message}</p>
            <div className="flex gap-4"><button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 bg-gray-50 text-gray-400 font-black rounded-2xl">取消</button><button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-[#d93025] text-white font-black rounded-2xl shadow-xl shadow-red-100">確定執行</button></div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className={`w-16 h-16 ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'} rounded-full flex items-center justify-center mx-auto mb-6`}>{notification.type === 'success' ? <Check className="w-8 h-8 text-green-600" /> : <X className="w-8 h-8 text-red-600" />}</div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{notification.title}</h3>
            <p className="text-gray-500 font-bold mb-10">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="w-full py-4 bg-[#0b57d0] text-white font-black rounded-2xl shadow-lg shadow-blue-100">關閉</button>
          </div>
        </div>
      )}

      <footer className="text-center py-12 text-gray-400">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">Office Catering Management System • Cloud Version</div>
        <p className="text-[11px] font-black px-6 opacity-40">已連接至 Firebase Firestore 實時資料庫</p>
      </footer>
    </div>
  );
}
