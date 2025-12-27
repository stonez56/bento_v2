
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
  CloudDownload,
  Lock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

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
const auth = getAuth(app);

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

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        setLoginError('');
      }
    });
    return () => unsubscribe();
  }, []);

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
    if (isLoading || !isLoggedIn) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'data', 'users'), { list: users });
        const menuToSave = menuItems.map(({ icon, ...rest }) => rest);
        await setDoc(doc(db, 'settings', 'menu'), { items: menuToSave });
      } catch (e) {
        console.error("Cloud sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); 
    return () => clearTimeout(timer);
  }, [users, menuItems, isLoading, isLoggedIn]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginForm.id, loginForm.pwd);
      setLoginError('');
    } catch (error: any) {
      setLoginError('帳號或密碼錯誤，或該帳號尚未在 Firebase 註冊');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLoginForm({ id: '', pwd: '' });
      setActiveTab('order');
    } catch (error) {
      console.error("Logout error", error);
    }
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
      title: '執行本週結算',
      message: '確定要清除本週所有點餐資料，並自動從每位同事的儲值帳戶中扣除餐費嗎？此操作無法復原。',
      onConfirm: () => {
        setUsers(prev => prev.map(user => ({ 
          ...user, 
          balance: user.balance - getUserWeeklyTotal(user),
          selections: {} 
        })));
        setConfirmDialog(null);
        setNotification({ title: '結算完成', message: '已成功扣款並清空點餐表，資料已同步至雲端。', type: 'success' });
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
        setNotification({ title: '重複名稱', message: '該名稱已存在，請使用不同名稱。', type: 'error' });
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
      title: '刪除人員',
      message: `確定要從系統中移除「${name}」嗎？這會清除其所有雲端資料與餘額。`,
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
    setNotification({ title: '餐點已更新', message: '新的餐點名稱或價格已即時套用到所有點餐畫面。', type: 'success' });
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f9] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#0b57d0]/10 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[#0b57d0] font-black tracking-widest uppercase text-sm animate-pulse">正在連接雲端資料庫</div>
          <div className="text-gray-400 text-[10px] mt-2 font-bold">Secure Cloud Connection via Firebase</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9] p-4 font-['Noto_Sans_TC']">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-500 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#0b57d0]"></div>
          
          <div className="text-center mb-10 mt-4">
            <div className="bg-[#e8f0fe] w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm group hover:scale-105 transition-transform">
              <ClipboardList className="text-[#0b57d0] w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">辦公室訂餐系統</h1>
            <p className="text-gray-500 mt-2 font-medium">Material Design 3 Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">帳號 ID (Email)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0b57d0] transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={loginForm.id} 
                  onChange={e => setLoginForm({...loginForm, id: e.target.value})} 
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#0b57d0] outline-none transition-all font-black text-gray-900 placeholder-gray-400" 
                  placeholder="admin@example.com" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">密碼 Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0b57d0] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  value={loginForm.pwd} 
                  onChange={e => setLoginForm({...loginForm, pwd: e.target.value})} 
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#0b57d0] outline-none transition-all font-black text-gray-900 placeholder-gray-400" 
                  placeholder="請輸入密碼" 
                />
              </div>
            </div>
            
            {loginError && (
              <div className="bg-[#fce8e6] text-[#d93025] p-4 rounded-2xl text-sm flex items-center gap-3 border border-[#f5c2c7] animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{loginError}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-black py-4.5 rounded-2xl shadow-lg shadow-blue-100 hover:shadow-blue-200 transform active:scale-[0.98] transition-all text-lg tracking-wide"
            >
              進入管理介面
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
            <div className="text-[10px] text-gray-300 uppercase font-black tracking-[0.2em]">Google Material 3 System</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f9] flex flex-col pb-10 font-['Noto_Sans_TC']">
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#0b57d0] p-2.5 rounded-2xl shadow-md">
              <Calendar className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                辦公室訂餐
                {isSyncing ? (
                  <RefreshCcw className="w-4 h-4 text-[#0b57d0] animate-spin" />
                ) : (
                  <CloudCheck className="w-4 h-4 text-green-500" />
                )}
              </h1>
              <div className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.15em]">Real-time Cloud Management</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex bg-gray-100/60 p-1.5 rounded-2xl mr-2 no-scrollbar overflow-x-auto whitespace-nowrap border border-gray-100">
              <button 
                onClick={() => setActiveTab('order')} 
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'order' ? 'bg-white shadow-sm text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                點餐系統
              </button>
              <button 
                onClick={() => setActiveTab('manage')} 
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'manage' ? 'bg-white shadow-sm text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <Wallet className="w-4 h-4" />
                儲值結算
              </button>
              <button 
                onClick={() => setActiveTab('menu')} 
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2.5 ${activeTab === 'menu' ? 'bg-white shadow-sm text-[#0b57d0]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                餐點管理
              </button>
            </nav>
            <button 
              onClick={handleLogout} 
              className="p-3 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-2xl transition-all active:scale-90"
              title="登出系統"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-8">
        {activeTab === 'order' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Week Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateWeek(-1)} 
                  className="p-3.5 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-500 border border-gray-100"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="px-10 text-center border-x border-gray-100">
                  <span className="text-[10px] font-black text-[#0b57d0] uppercase tracking-[0.2em] mb-1.5 block">本週期間</span>
                  <div className="text-xl font-black text-gray-900 tracking-tight">
                    {weekDates[0].dateStr.split('-').slice(1).join('/')} - {weekDates[4].dateStr.split('-').slice(1).join('/')}
                  </div>
                </div>
                <button 
                  onClick={() => navigateWeek(1)} 
                  className="p-3.5 hover:bg-gray-100 rounded-2xl transition-all active:scale-75 text-gray-500 border border-gray-100"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3 px-6 py-3.5 bg-[#e8f0fe] rounded-2xl text-[#0b57d0] text-sm font-black uppercase tracking-widest border border-blue-50">
                  <CloudDownload className="w-4 h-4" />
                  雲端即時同步已就緒
                </div>
              </div>
            </div>

            {/* Calendar Table */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-gray-100">
                      <th className="sticky left-0 z-20 bg-[#fafafa] px-10 py-6 text-left font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] min-w-[160px]">
                        同事姓名
                      </th>
                      {weekDates.map(wd => (
                        <th key={wd.dateStr} className="px-6 py-6 border-l border-gray-100 min-w-[200px]">
                          <div className="text-[#0b57d0] font-black text-lg leading-none mb-1">{wd.label}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{wd.dateStr}</div>
                        </th>
                      ))}
                      <th className="px-10 py-6 bg-gray-50/50 font-black text-gray-400 text-[10px] tracking-[0.2em] uppercase min-w-[150px]">
                        本週小計
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, idx) => {
                      const userTotal = getUserWeeklyTotal(user);
                      return (
                        <tr key={user.userName} className="group hover:bg-blue-50/10 transition-colors">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#fcfdfe] px-10 py-7 font-black text-gray-900 text-lg whitespace-nowrap shadow-[4px_0_12px_rgba(0,0,0,0.01)]">
                            <span className="text-gray-300 mr-2.5 text-sm font-bold tracking-tighter">#{idx + 1}</span>
                            {user.userName}
                          </td>
                          {weekDates.map(wd => {
                            const dayOrder = user.selections[wd.dateStr];
                            const ordered = Object.entries(dayOrder || {}).filter(([_, c]) => c > 0);
                            return (
                              <td key={wd.dateStr} className="p-3.5 border-r border-gray-50 align-top">
                                <button 
                                  onClick={() => setModalData({ userName: user.userName, dateStr: wd.dateStr, label: wd.label })} 
                                  className={`
                                    w-full min-h-[80px] rounded-[1.5rem] p-4 text-left transition-all flex flex-col gap-2 border-2
                                    ${ordered.length > 0 
                                      ? 'bg-[#e8f0fe] border-[#0b57d0] shadow-sm transform scale-[1.01]' 
                                      : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  {ordered.length > 0 ? (
                                    <div className="space-y-2">
                                      {ordered.map(([id, c]) => {
                                        const item = menuItems.find(m => m.id === id);
                                        return item ? (
                                          <div key={id} className="flex items-center gap-2.5 text-xs font-black text-[#0b57d0]">
                                            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                            <span>{item.name} <span className="opacity-50 text-[10px]">x</span>{c}</span>
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <div className="m-auto text-gray-300 text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">點擊點餐</div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-10 py-7 text-center">
                            <div className={`
                              inline-flex px-5 py-2 rounded-full text-sm font-black shadow-sm
                              ${userTotal > 0 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 opacity-60'}
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
            
            {/* Statistics Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 shadow-sm border border-amber-100">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">雲端出貨統計表</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Real-time Vendor Summary</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
                  {stats.dailyStats.map(day => (
                    <div key={day.dateStr} className="bg-gray-50/50 rounded-[1.75rem] p-6 border border-gray-100 flex flex-col hover:bg-white hover:shadow-md transition-all">
                      <div className="text-center mb-6">
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{day.dateStr}</div>
                        <div className="font-black text-gray-900 text-lg leading-none">{day.label}</div>
                      </div>
                      <div className="space-y-4 flex-grow">
                        {menuItems.map(item => {
                          const count = day.itemCounts[item.id] || 0;
                          return (
                            <div key={item.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2.5">
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                <span className="text-[11px] font-black text-gray-500">{item.name}</span>
                              </div>
                              <span className={`text-sm font-black ${count > 0 ? 'text-[#0b57d0]' : 'text-gray-300'}`}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">合計</span>
                        <span className="text-base font-black text-gray-900">${day.dailyTotal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1a1c1e] rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-2xl overflow-hidden relative group">
                <div className="absolute -top-12 -right-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                  <Calculator className="w-56 h-56" />
                </div>
                <div className="relative z-10">
                  <div className="text-[#8ab4f8] font-black text-xs uppercase tracking-[0.3em] mb-3">Weekly Cloud Total</div>
                  <h2 className="text-3xl font-black mb-12 tracking-tight">本週應付廠商總額</h2>
                  <div className="flex items-baseline gap-3 mb-12">
                    <span className="text-4xl font-black text-[#8ab4f8] tracking-tighter">$</span>
                    <span className="text-7xl font-black tracking-tighter tabular-nums">{stats.weeklyGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="w-3 h-3 bg-[#8ab4f8] rounded-full animate-pulse shadow-[0_0_15px_#8ab4f8]"></div>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-widest">資料已同步至所有設備</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'manage' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="bg-[#0b57d0] p-5 rounded-[1.75rem] shadow-lg shadow-blue-100">
                  <RefreshCcw className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">儲值與雲端結算</h2>
                  <p className="text-gray-400 font-bold text-sm mt-1">變更將即時發送到所有同事設備</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setUserModal({ mode: 'add', currentName: '' })} 
                  className="flex items-center gap-3 bg-white text-[#0b57d0] border-2 border-blue-100 px-7 py-4.5 rounded-2xl font-black hover:bg-[#0b57d0] hover:text-white transition-all text-lg shadow-lg active:scale-[0.97]"
                >
                  <UserPlus className="w-6 h-6" />
                  新增同事
                </button>
                <button 
                  onClick={triggerSettlement} 
                  className="flex items-center gap-3 bg-white text-[#d93025] border-2 border-red-100 px-8 py-4.5 rounded-2xl font-black hover:bg-[#d93025] hover:text-white transition-all text-lg shadow-xl active:scale-[0.97]"
                >
                  <Trash2 className="w-6 h-6" />
                  本週結算
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 flex items-center gap-8 shadow-sm group hover:shadow-md transition-shadow">
                <div className="bg-[#e8f0fe] p-5 rounded-[1.5rem] text-[#0b57d0] group-hover:scale-105 transition-transform">
                  <Wallet className="w-9 h-9" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">雲端總儲值額</div>
                  <div className="text-3xl font-black text-gray-900 tracking-tighter">${users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 flex items-center gap-8 shadow-sm group hover:shadow-md transition-shadow">
                <div className="bg-[#fef7e0] p-5 rounded-[1.5rem] text-amber-500 group-hover:scale-105 transition-transform">
                  <TrendingDown className="w-9 h-9" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">預計本週支出</div>
                  <div className="text-3xl font-black text-gray-900 tracking-tighter">${stats.weeklyGrandTotal.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 flex items-center gap-8 shadow-sm group hover:shadow-md transition-shadow">
                <div className="bg-[#e6f4ea] p-5 rounded-[1.5rem] text-green-600 group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="w-9 h-9" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">結算後總餘額</div>
                  <div className="text-3xl font-black text-green-600 tracking-tighter">${(users.reduce((sum, u) => sum + u.balance, 0) - stats.weeklyGrandTotal).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-10 py-7 bg-[#fafafa] border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <History className="w-5 h-5 text-gray-400" />
                  <span className="font-black text-gray-800 text-sm uppercase tracking-widest">同事帳戶狀態與操作</span>
                </div>
                <div className="text-[9px] font-black text-[#0b57d0] bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">Live Syncing</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-12 py-6 text-left font-black text-gray-400 text-[10px] tracking-widest uppercase">同事姓名</th>
                      <th className="px-8 py-6 text-right font-black text-gray-400 text-[10px] tracking-widest uppercase">本週應付</th>
                      <th className="px-8 py-6 text-center font-black text-gray-400 text-[10px] tracking-widest uppercase">儲值加值</th>
                      <th className="px-8 py-6 text-right font-black text-gray-400 text-[10px] tracking-widest uppercase">目前 &rarr; 結算後餘額</th>
                      <th className="px-12 py-6 text-center font-black text-gray-400 text-[10px] tracking-widest uppercase">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user, idx) => {
                      const spent = getUserWeeklyTotal(user);
                      const future = user.balance - spent;
                      return (
                        <tr key={user.userName} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-12 py-7 font-black text-gray-900 text-lg whitespace-nowrap">
                            <span className="text-gray-300 mr-3 text-sm font-bold tracking-tighter">#{idx + 1}</span>
                            {user.userName}
                          </td>
                          <td className="px-8 py-7 text-right whitespace-nowrap">
                            <span className={`font-black text-base tabular-nums ${spent > 0 ? 'text-[#d93025]' : 'text-gray-300'}`}>
                              ${spent}
                            </span>
                          </td>
                          <td className="px-8 py-7 text-center whitespace-nowrap">
                            <button 
                              onClick={() => setRechargeModal({ userName: user.userName, currentBalance: user.balance })} 
                              className="inline-flex items-center gap-2.5 bg-white text-[#0b57d0] border-2 border-blue-50 px-6 py-3 rounded-2xl font-black text-sm hover:bg-[#0b57d0] hover:text-white hover:border-[#0b57d0] transition-all shadow-sm active:scale-95"
                            >
                              <PlusCircle className="w-4 h-4" />
                              點擊儲值
                            </button>
                          </td>
                          <td className="px-8 py-7 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center px-6 py-2.5 rounded-2xl text-sm font-black tabular-nums border ${future >= 0 ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-red-50 text-red-700 border-red-100 animate-pulse'}`}>
                              ${user.balance} <span className="mx-2 opacity-30">&rarr;</span> ${future}
                            </span>
                          </td>
                          <td className="px-12 py-7 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-3">
                              <button onClick={() => setUserModal({ mode: 'edit', oldName: user.userName, currentName: user.userName })} className="p-3 text-gray-400 hover:text-[#0b57d0] hover:bg-blue-50 rounded-2xl transition-all active:scale-90" title="修改同事姓名"><Pencil className="w-4.5 h-4.5" /></button>
                              <button onClick={() => triggerDeleteUser(user.userName)} className="p-3 text-gray-400 hover:text-[#d93025] hover:bg-red-50 rounded-2xl transition-all active:scale-90" title="移除同事"><UserMinus className="w-4.5 h-4.5" /></button>
                            </div>
                          </td>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="bg-[#0b57d0] p-5 rounded-[1.75rem] shadow-lg shadow-blue-100">
                  <UtensilsCrossed className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">雲端菜單配置</h2>
                  <p className="text-gray-400 font-bold text-sm mt-1">此處修改將即時反映至所有同事的點餐表</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative border-b-4 border-b-transparent hover:border-b-[#0b57d0]">
                  <div className={`absolute -top-10 -right-10 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000 ${item.color}`}>
                    <item.icon className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-6 rounded-[2rem] bg-gray-50 mb-8 group-hover:bg-white group-hover:shadow-md transition-all ${item.color}`}>
                      <item.icon className="w-12 h-12" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-2">{item.name}</h3>
                    <div className="text-4xl font-black text-[#0b57d0] mb-10 tracking-tighter">${item.price}</div>
                    <button 
                      onClick={() => setMenuEditModal({...item})} 
                      className="w-full bg-[#e8f0fe] text-[#0b57d0] py-4.5 rounded-[1.5rem] font-black text-sm hover:bg-[#0b57d0] hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <Pencil className="w-4.5 h-4.5 mr-2.5 inline" />
                      編輯內容
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-[#e8f0fe] p-10 rounded-[2.5rem] border border-blue-100 flex items-start gap-8 shadow-sm">
              <div className="bg-white p-4 rounded-2xl text-[#0b57d0] shadow-sm">
                <Info className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-[#0b57d0] tracking-tight">管理員操作指南</h3>
                <p className="text-blue-700/80 font-bold leading-relaxed max-w-4xl">
                  您可以在此處隨時調整餐點的名稱與價格。請注意，價格變動會即時反映在本週的小計金額中。如果您在本週已經結算完畢，建議在下週一新訂單開始前進行調整。
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS SECTION - ENHANCED MATERIAL DESIGN 3 STYLING */}

      {/* Menu Edit Modal */}
      {menuEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fafafa]">
              <div className="flex items-center gap-4">
                <div className="bg-[#0b57d0] w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  <Pencil className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">編輯餐點內容</h3>
              </div>
              <button onClick={() => setMenuEditModal(null)} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleMenuUpdate} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">餐點名稱</label>
                <input type="text" required value={menuEditModal.name} onChange={e => setMenuEditModal({...menuEditModal, name: e.target.value})} className="w-full px-6 py-4.5 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] bg-gray-50 focus:bg-white font-black text-gray-900 text-lg transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">單價 ($)</label>
                <input type="number" required min="0" value={menuEditModal.price} onChange={e => setMenuEditModal({...menuEditModal, price: parseInt(e.target.value) || 0})} className="w-full px-6 py-4.5 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] bg-gray-50 focus:bg-white font-black text-gray-900 text-lg transition-all" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setMenuEditModal(null)} className="flex-1 py-4.5 bg-gray-100 rounded-2xl font-black text-gray-500 hover:bg-gray-200 transition-colors">取消</button>
                <button type="submit" className="flex-1 py-4.5 bg-[#0b57d0] text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-[#0842a0] transition-all transform active:scale-[0.98]">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {userModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-[#fafafa]">
              <div className="flex items-center gap-4">
                <div className="bg-[#0b57d0] w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  {userModal.mode === 'add' ? <UserPlus className="w-6 h-6" /> : <Pencil className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{userModal.mode === 'add' ? '新增雲端同事' : '修改同事名稱'}</h3>
              </div>
              <button onClick={() => setUserModal(null)} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUserAction} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">同事姓名</label>
                <input type="text" autoFocus required value={userModal.currentName} onChange={e => setUserModal({...userModal, currentName: e.target.value})} className="w-full px-6 py-4.5 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#0b57d0] bg-gray-50 focus:bg-white font-black text-gray-900 text-lg transition-all" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setUserModal(null)} className="flex-1 py-4.5 bg-gray-100 rounded-2xl font-black text-gray-500 hover:bg-gray-200 transition-colors">取消</button>
                <button type="submit" className="flex-1 py-4.5 bg-[#0b57d0] text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-[#0842a0] transition-all transform active:scale-[0.98]">{userModal.mode === 'add' ? '建立雲端帳號' : '儲存修改'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#fafafa]">
              <div className="flex items-center gap-5">
                <div className="bg-[#0b57d0] w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-md">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-none">{modalData.userName}</h3>
                  <div className="text-[#0b57d0] font-black text-[10px] uppercase tracking-[0.2em] mt-2.5 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {modalData.label} • {modalData.dateStr}
                  </div>
                </div>
              </div>
              <button onClick={() => setModalData(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><X className="w-7 h-7 text-gray-400" /></button>
            </div>
            <div className="p-10 space-y-5 bg-white">
              {menuItems.map(item => {
                const count = currentSelections[item.id] || 0;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-5 rounded-[1.75rem] transition-all border-2 ${count > 0 ? 'bg-[#e8f0fe] border-[#0b57d0] shadow-sm' : 'bg-white border-gray-50'}`}>
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                        <item.icon className={`w-7 h-7 ${item.color}`} />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 text-lg leading-tight">{item.name}</div>
                        <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">${item.price} / 份</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-100/50 p-2 rounded-2xl border border-gray-100 shadow-inner">
                      <button 
                        onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, -1)} 
                        className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${count > 0 ? 'bg-white shadow-sm text-gray-700 hover:text-[#d93025]' : 'text-gray-300 pointer-events-none'}`}
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="w-8 text-center font-black text-xl text-gray-900 tabular-nums">{count}</span>
                      <button 
                        onClick={() => updateOrderQuantity(modalData.userName, modalData.dateStr, item.id, 1)} 
                        className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-700 hover:text-[#0b57d0] active:scale-95"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-10 pb-12 pt-2 flex flex-col gap-6">
              <div className="flex justify-between items-center px-8 py-5 bg-[#1a1c1e] rounded-[1.75rem] text-white shadow-xl">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">當日點餐合計</span>
                <span className="text-3xl font-black text-[#8ab4f8] tabular-nums">
                  ${menuItems.reduce((s, i) => s + (currentSelections[i.id] || 0) * i.price, 0)}
                </span>
              </div>
              <button 
                onClick={() => setModalData(null)} 
                className="w-full bg-[#0b57d0] py-5 rounded-[1.75rem] text-white font-black text-xl shadow-lg shadow-blue-100 hover:bg-[#0842a0] transition-all transform active:scale-[0.98]"
              >
                確認點餐並儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {rechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1a1c1e]/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-10 animate-in zoom-in duration-300">
            <h3 className="text-3xl font-black text-gray-900 mb-2 leading-none">帳戶儲值</h3>
            <div className="text-[#0b57d0] font-black text-[10px] uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {rechargeModal.userName} • 雲端即時同步
            </div>
            <form onSubmit={handleRechargeSubmit} className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {[100, 500, 1000].map(amt => (
                  <button key={amt} type="button" onClick={() => setCustomAmount((a) => (parseInt(a) || 0) + amt + "")} className="py-5 bg-gray-50 border-2 border-transparent hover:border-[#0b57d0] hover:bg-[#e8f0fe] rounded-2xl font-black text-gray-500 hover:text-[#0b57d0] transition-all transform active:scale-95">+${amt}</button>
                ))}
              </div>
              <div className="space-y-3 relative group">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">自訂儲值金額 ($)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300 group-focus-within:text-[#0b57d0] transition-colors">$</span>
                  <input 
                    type="number" 
                    autoFocus 
                    step="100" 
                    value={customAmount} 
                    onChange={e => setCustomAmount(e.target.value)} 
                    className="w-full pl-14 pr-6 py-6 rounded-[1.75rem] border-2 border-gray-100 outline-none focus:border-[#0b57d0] bg-gray-50 focus:bg-white font-black text-4xl text-gray-900 transition-all tabular-nums" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div className="bg-[#fafafa] p-8 rounded-[2rem] flex justify-between items-center border border-gray-100 shadow-inner">
                <div className="text-right flex flex-col items-start">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">目前餘額</span>
                  <span className="text-xl font-black text-gray-500 tabular-nums">${rechargeModal.currentBalance}</span>
                </div>
                <ArrowUpRight className="w-6 h-6 text-[#0b57d0] opacity-30" />
                <div className="text-left flex flex-col items-end">
                  <span className="text-[10px] font-black text-[#0b57d0] uppercase tracking-widest">加值後預計</span>
                  <span className="text-3xl font-black text-green-600 tabular-nums">
                    ${rechargeModal.currentBalance + (parseInt(customAmount) || 0)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => { setRechargeModal(null); setCustomAmount(''); }} className="flex-1 py-5 bg-gray-100 rounded-2xl font-black text-gray-500 hover:bg-gray-200 transition-colors">取消</button>
                <button type="submit" disabled={!customAmount || parseInt(customAmount) <= 0} className="flex-1 py-5 bg-[#0b57d0] disabled:opacity-30 disabled:pointer-events-none text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-[#0842a0] transition-all transform active:scale-[0.98]">確認儲值</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a1c1e]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <ShieldAlert className="w-10 h-10 text-[#d93025]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{confirmDialog.title}</h3>
            <p className="text-gray-500 font-bold leading-relaxed mb-12">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-colors">取消</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-5 bg-[#d93025] text-white font-black rounded-2xl shadow-xl shadow-red-100 hover:bg-[#b21f16] transition-all transform active:scale-[0.98]">確認執行</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#1a1c1e]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className={`w-20 h-20 ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'} rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm`}>
              {notification.type === 'success' ? <Check className="w-10 h-10 text-green-600" /> : <X className="w-10 h-10 text-red-600" />}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{notification.title}</h3>
            <p className="text-gray-500 font-bold mb-12 leading-relaxed">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="w-full py-5 bg-[#0b57d0] text-white font-black rounded-2xl shadow-lg shadow-blue-100 hover:bg-[#0842a0] transition-all transform active:scale-[0.98]">關閉</button>
          </div>
        </div>
      )}

      <footer className="text-center py-16 text-gray-400">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-60">Office Catering Management System • Cloud Core</div>
        <p className="text-[11px] font-black px-6 opacity-30">Powered by Google Material Design & Firebase Firestore</p>
      </footer>
    </div>
  );
}