
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, LogOut, User, AlertCircle, 
  Minus, Plus, X, 
  RefreshCcw, UtensilsCrossed, 
  ChevronLeft, ChevronRight,
  Settings, PieChart, ShoppingCart, CreditCard,
  Banknote, RotateCcw, Edit3, ArrowRight,
  PlusCircle, MinusCircle, Equal
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, doc, setDoc, onSnapshot } from './firebase';
import { MenuItem, UserData, ActiveTab } from './types';
import { getStartOfWeek, formatDate, WEEK_DAYS } from './utils';

const DEFAULT_MENU: MenuItem[] = [
  { id: 'bento', name: '便當', price: 95, icon: '🍱', color: 'text-orange-500' },
  { id: 'riceNoodle', name: '米粉', price: 80, icon: '🍜', color: 'text-rose-500' },
  { id: 'friedNoodle', name: '炒麵', price: 80, icon: '🍝', color: 'text-amber-500' },
  { id: 'dumplings', name: '水餃', price: 70, icon: '🥟', color: 'text-yellow-600' },
];

const DEFAULT_ADMIN = { id: 'admin@bento.com', pwd: '@abuybento2' };
const INITIAL_NAMES = ["張芷涵", "陳怡君", "劉宛蓉", "吳思潔", "蔡欣怡", "周承翰", "許雅婷", "楊佳穎", "羅慧玲", "鄭志宏"];

// Helper to force correct icons even if DB data is stale
const getSmartIcon = (item: MenuItem) => {
  if (item.id === 'bento' || item.name.includes('便當')) return '🍱';
  if (item.id === 'riceNoodle' || item.name.includes('米粉')) return '🍜';
  if (item.id === 'friedNoodle' || item.name.includes('炒麵')) return '🍝';
  if (item.id === 'dumplings' || item.name.includes('水餃')) return '🥟';
  return item.icon || '🍱';
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBypassMode, setIsBypassMode] = useState(false); 
  const [loginForm, setLoginForm] = useState(DEFAULT_ADMIN);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab | 'summary'>('order');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU);
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));

  // Modal States
  const [modal, setModal] = useState<{ userName: string, dateStr: string, label: string } | null>(null);
  const [depositModal, setDepositModal] = useState<{ userName: string } | null>(null);
  const [editMealModal, setEditMealModal] = useState<MenuItem | null>(null);
  
  // Deposit Logic States
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [depositMode, setDepositMode] = useState<'add' | 'sub' | 'set'>('add');

  const effectiveLoggedIn = isLoggedIn || isBypassMode;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (!user) setIsBypassMode(false);
      setIsLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!effectiveLoggedIn) return;
    setIsLoading(true);
    const unsubMenu = onSnapshot(doc(db, 'settings', 'menu'), (snap) => {
      if (snap.exists()) setMenuItems(snap.data().items);
    });

    const unsubUsers = onSnapshot(doc(db, 'data', 'users'), (snap) => {
      if (snap.exists()) {
        setUsers(snap.data().list);
      } else {
        setUsers(INITIAL_NAMES.map(name => ({ userName: name, balance: 0, selections: {} })));
      }
      setIsLoading(false);
    }, (err) => {
      if (isBypassMode && users.length === 0) {
        setUsers(INITIAL_NAMES.map(name => ({ userName: name, balance: 0, selections: {} })));
      }
      setIsLoading(false);
    });
    return () => { unsubMenu(); unsubUsers(); };
  }, [effectiveLoggedIn, isBypassMode]);

  useEffect(() => {
    if (isLoading || !effectiveLoggedIn || users.length === 0) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'data', 'users'), { list: users });
        await setDoc(doc(db, 'settings', 'menu'), { items: menuItems });
      } catch (e) {
        console.warn("Save failed:", e);
      } finally {
        setIsSyncing(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [users, menuItems, isLoading, effectiveLoggedIn]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return { label: WEEK_DAYS[i], dateStr: formatDate(d) };
    });
  }, [currentWeekStart]);

  const dailySummary = useMemo(() => {
    const summary: Record<string, Record<string, number>> = {};
    weekDates.forEach(wd => {
      summary[wd.dateStr] = {};
      users.forEach(u => {
        const dayOrder = u.selections[wd.dateStr] || {};
        Object.entries(dayOrder).forEach(([itemId, qty]) => {
          summary[wd.dateStr][itemId] = (summary[wd.dateStr][itemId] || 0) + (qty as number);
        });
      });
    });
    return summary;
  }, [users, weekDates]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.id, loginForm.pwd);
    } catch (err: any) {
      if (loginForm.id === DEFAULT_ADMIN.id && loginForm.pwd === DEFAULT_ADMIN.pwd) {
        setIsBypassMode(true);
        setIsLoading(false);
        return;
      }
      setLoginError('帳號或密碼錯誤。');
      setIsLoading(false);
    }
  };

  const finalizeTransaction = () => {
    if (!depositModal) return;
    const user = users.find(u => u.userName === depositModal.userName);
    if (!user) return;

    let newBalance = user.balance;
    if (depositMode === 'add') newBalance += pendingAmount;
    else if (depositMode === 'sub') newBalance -= pendingAmount;
    else if (depositMode === 'set') newBalance = pendingAmount;

    setUsers(prev => prev.map(u => 
      u.userName === depositModal.userName ? { ...u, balance: newBalance } : u
    ));
    setDepositModal(null);
    setPendingAmount(0);
    setDepositMode('add');
  };

  const handleUpdateMeal = () => {
    if (!editMealModal) return;
    setMenuItems(prev => prev.map(m => m.id === editMealModal.id ? editMealModal : m));
    setEditMealModal(null);
  };

  const currentUser = useMemo(() => {
    if (!depositModal) return null;
    return users.find(u => u.userName === depositModal.userName);
  }, [depositModal, users]);

  if (isLoading && !effectiveLoggedIn) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <RefreshCcw className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
      <h2 className="text-lg font-bold tracking-[0.2em] uppercase text-indigo-300/50">Smart Bento Loading...</h2>
    </div>
  );

  if (!effectiveLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(79,70,229,0.2)] w-full max-w-md space-y-6 border border-indigo-50">
          <div className="text-center space-y-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
              <ShoppingCart className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Smart Bento</h1>
            <p className="text-indigo-400 font-medium">辦公室雲端訂餐</p>
          </div>
          <div className="space-y-4">
            <div>
              <input type="email" placeholder="Admin ID" required value={loginForm.id} onChange={e => setLoginForm({...loginForm, id: e.target.value})} className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all" />
            </div>
            <div>
              <input type="password" placeholder="Password" required value={loginForm.pwd} onChange={e => setLoginForm({...loginForm, pwd: e.target.value})} className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all" />
            </div>
            {loginError && <div className="flex items-center gap-2 text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-lg"><AlertCircle size={16} /> {loginError}</div>}
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.96]">登入</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6f9]">
      {/* 
        COMPACT HEADER DESIGN 
        Reduced padding (py-2), smaller height, integrated tab navigation.
      */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-indigo-100 px-4 py-2 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg shadow-md"><UtensilsCrossed className="text-white w-5 h-5" /></div>
          <h1 className="text-lg font-black text-slate-900 hidden md:block">Smart Bento</h1>
        </div>
        
        {/* Compact Nav */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {[
            { id: 'order', icon: ShoppingCart, label: '點餐' },
            { id: 'summary', icon: PieChart, label: '統計' },
            { id: 'manage', icon: CreditCard, label: '錢包' },
            { id: 'menu', icon: Settings, label: '設定' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? `bg-white text-indigo-600 shadow-sm ring-1 ring-black/5` : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={14} /> <span className="">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
           {isSyncing && <RefreshCcw className="w-4 h-4 animate-spin text-indigo-500" />}
           <div className="h-5 w-px bg-slate-200 mx-1" />
           <button onClick={() => { signOut(auth); setIsBypassMode(false); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-2 md:p-4 space-y-4">
        {/* Integrated Compact Week Selector */}
        <div className="flex justify-between items-center bg-white p-2 px-4 rounded-xl border border-indigo-50 shadow-sm">
            <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))} className="p-1.5 hover:bg-slate-50 rounded-lg text-indigo-600"><ChevronLeft size={20}/></button>
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Week of</span>
              <div className="text-sm font-black text-slate-800 tabular-nums">{weekDates[0].dateStr} ~ {weekDates[4].dateStr}</div>
            </div>
            <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))} className="p-1.5 hover:bg-slate-50 rounded-lg text-indigo-600"><ChevronRight size={20}/></button>
        </div>

        {/* Dynamic Content */}
        {activeTab === 'order' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up relative">
            <div className="overflow-x-auto max-h-[80vh]">
              <table className="w-full text-left border-collapse">
                {/* Compact Sticky Header */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  <tr className="bg-slate-50 border-b border-slate-200 sticky-header">
                    <th className="px-6 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-40 border-r border-slate-200/50">同事姓名</th>
                    {weekDates.map(wd => (
                      <th key={wd.dateStr} className="px-2 py-3 text-center border-l border-slate-200 bg-slate-50 min-w-[100px]">
                        <div className="text-slate-800 font-bold text-xs">{wd.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium tabular-nums">{wd.dateStr.split('-').slice(1).join('/')}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50">本週合計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user, idx) => {
                    let weeklyTotal = 0;
                    weekDates.forEach(wd => {
                      const dayOrder = user.selections[wd.dateStr] || {};
                      Object.entries(dayOrder).forEach(([id, qty]) => {
                        const item = menuItems.find(m => m.id === id);
                        if (item) weeklyTotal += item.price * (qty as number);
                      });
                    });
                    return (
                      <tr key={user.userName} className="hover:bg-indigo-50/10 transition-colors group">
                        {/* Compact User Name Cell */}
                        <td className="px-6 py-3 text-sm font-bold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100 group-hover:bg-slate-50">{user.userName}</td>
                        {weekDates.map(wd => {
                          const order = user.selections[wd.dateStr] || {};
                          const hasOrder = Object.keys(order).length > 0;
                          return (
                            <td key={wd.dateStr} className="px-1 py-1 h-full">
                              <button onClick={() => setModal({ userName: user.userName, dateStr: wd.dateStr, label: wd.label })} 
                                className={`w-full h-full min-h-[50px] rounded-lg p-1.5 border transition-all flex flex-col items-center justify-center gap-0.5 group/btn ${hasOrder ? 'bg-indigo-50 border-indigo-100' : 'bg-transparent border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                                {hasOrder ? Object.entries(order).map(([id, qty]) => {
                                  const item = menuItems.find(m => m.id === id);
                                  return (
                                    <div key={id} className="text-[11px] font-bold leading-none flex items-center gap-1 text-slate-700 w-full justify-center">
                                      {/* Force Icon Render */}
                                      <span className="text-base leading-none emoji-font">{item ? getSmartIcon(item) : '🍱'}</span> 
                                      {item?.name.substring(0,2)} <span className="text-indigo-500 text-[10px] font-black">x{qty}</span>
                                    </div>
                                  );
                                }) : <Plus size={16} className="text-slate-200 group-hover/btn:text-slate-400" />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${weeklyTotal > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-300'}`}>
                            ${weeklyTotal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Tab - Compact Cards */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
            {weekDates.map(wd => {
              const items = dailySummary[wd.dateStr] || {};
              const dayTotal = Object.entries(items).reduce((acc, [id, qty]) => {
                const item = menuItems.find(m => m.id === id);
                return acc + (item ? item.price * qty : 0);
              }, 0);
              return (
                <div key={wd.dateStr} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{wd.label}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{wd.dateStr}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-indigo-400 font-bold uppercase">Revenue</div>
                      <div className="text-xl font-black text-indigo-600">${dayTotal}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(items).length > 0 ? Object.entries(items).map(([id, qty]) => {
                      const item = menuItems.find(m => m.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            <span className="text-lg leading-none emoji-font">{item ? getSmartIcon(item) : '🍱'}</span>
                            {item?.name || '未知'}
                          </span>
                          <span className="text-xs font-black text-white bg-indigo-500 px-2 py-0.5 rounded-md">x {qty}</span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-4 text-xs text-slate-300 font-medium">無點餐數據</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Wallet/Manage Tab - Compact Grid */}
        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
            {users.map(user => (
              <div key={user.userName} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={24}/></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 leading-tight">{user.userName}</h3>
                    <div className="text-sm font-bold text-slate-500">
                       <span className={`${user.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} tabular-nums`}>${user.balance}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setPendingAmount(0); setDepositMode('add'); setDepositModal({ userName: user.userName }); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all">
                  儲值
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Menu Tab - Clean List */}
        {activeTab === 'menu' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-slide-up">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Settings size={20}/> 菜單管理</h2>
             </div>
             <div className="space-y-3">
               {menuItems.map((item, idx) => (
                 <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-3xl leading-none emoji-font">{getSmartIcon(item)}</span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{item.name}</h3>
                        <div className="text-xs font-bold text-indigo-500">NT$ {item.price}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditMealModal(item)} className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-lg shadow-sm border border-slate-200"><Edit3 size={18}/></button>
                      <button onClick={() => setMenuItems(menuItems.filter((_, i) => i !== idx))} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-lg shadow-sm border border-slate-200"><Trash2 size={18}/></button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      {/* Order Selection Modal - Standard Size */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{modal.userName}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{modal.label} 點餐</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {menuItems.map(item => {
                const count = (users.find(u => u.userName === modal.userName)?.selections[modal.dateStr]?.[item.id] || 0);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none emoji-font">{getSmartIcon(item)}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                        <div className="text-xs font-bold text-slate-400">$ {item.price}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                      <button onClick={() => setUsers(prev => prev.map(u => {
                        if (u.userName !== modal.userName) return u;
                        const sels = { ...u.selections }; const day = { ...(sels[modal.dateStr] || {}) };
                        day[item.id] = Math.max(0, (day[item.id] || 0) - 1);
                        if (day[item.id] === 0) delete day[item.id];
                        sels[modal.dateStr] = day; return { ...u, selections: sels };
                      }))} className="text-slate-400 hover:text-rose-500"><Minus size={16}/></button>
                      <span className="text-base font-black w-6 text-center tabular-nums text-indigo-600">{count}</span>
                      <button onClick={() => setUsers(prev => prev.map(u => {
                        if (u.userName !== modal.userName) return u;
                        const sels = { ...u.selections }; const day = { ...(sels[modal.dateStr] || {}) };
                        day[item.id] = (day[item.id] || 0) + 1;
                        sels[modal.dateStr] = day; return { ...u, selections: sels };
                      }))} className="text-indigo-600 hover:text-indigo-800"><Plus size={16}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setModal(null)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">確認</button>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {editMealModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6">
            <h3 className="text-xl font-black text-slate-900">編輯餐點</h3>
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                 <span className="text-6xl emoji-font">{getSmartIcon(editMealModal)}</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2">名稱</label>
                <input 
                  type="text" 
                  value={editMealModal.name} 
                  onChange={e => setEditMealModal({...editMealModal, name: e.target.value})} 
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2">價格</label>
                <input 
                  type="number" 
                  value={editMealModal.price} 
                  onChange={e => setEditMealModal({...editMealModal, price: parseInt(e.target.value) || 0})} 
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditMealModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
              <button onClick={handleUpdateMeal} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal - COMPACT VERSION */}
      {depositModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[340px] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100">
            {/* Compact Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">{depositModal.userName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">餘額</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tabular-nums">${currentUser?.balance || 0}</span>
                </div>
              </div>
              <button onClick={() => setDepositModal(null)} className="p-1.5 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            
            {/* Compact Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => { setDepositMode('add'); setPendingAmount(0); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${depositMode === 'add' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>增加</button>
              <button onClick={() => { setDepositMode('sub'); setPendingAmount(0); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${depositMode === 'sub' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>減少</button>
              <button onClick={() => { setDepositMode('set'); setPendingAmount(currentUser?.balance || 0); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${depositMode === 'set' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400'}`}>修正</button>
            </div>

            {/* Compact Display Area */}
            <div className={`py-6 rounded-2xl text-center border-2 transition-all relative ${depositMode === 'sub' ? 'bg-rose-50 border-rose-100' : depositMode === 'set' ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
              <span className={`text-[10px] font-bold uppercase block mb-1 ${depositMode === 'sub' ? 'text-rose-400' : depositMode === 'set' ? 'text-amber-500' : 'text-indigo-400'}`}>
                {depositMode === 'set' ? '修正後金額' : `預計${depositMode === 'sub' ? '扣除' : '增加'}`}
              </span>
              <span className={`text-4xl font-black tabular-nums block ${depositMode === 'sub' ? 'text-rose-600' : depositMode === 'set' ? 'text-amber-600' : 'text-indigo-600'}`}>
                $ {pendingAmount}
              </span>
              <button onClick={() => setPendingAmount(depositMode === 'set' ? (currentUser?.balance || 0) : 0)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-slate-500"><RotateCcw size={14} /></button>
            </div>

            {/* Quick Buttons */}
            {depositMode !== 'set' && (
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(amount => (
                  <button key={amount} onClick={() => setPendingAmount(prev => prev + amount)} className="py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:border-indigo-400 hover:text-indigo-600 active:bg-slate-50">+{amount}</button>
                ))}
              </div>
            )}

            {/* Manual Input */}
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
               <input 
                  type="number" 
                  placeholder="自訂金額"
                  value={pendingAmount || ''}
                  onChange={e => setPendingAmount(Math.abs(parseInt(e.target.value)) || 0)}
                  className="w-full bg-transparent border-none focus:ring-0 text-center font-bold text-slate-800 py-2"
                />
            </div>

            <button 
              onClick={finalizeTransaction}
              className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.98] ${depositMode === 'sub' ? 'bg-rose-600' : depositMode === 'set' ? 'bg-amber-500' : 'bg-indigo-600'}`}
            >
              確認{depositMode === 'sub' ? '扣款' : depositMode === 'set' ? '修正' : '儲值'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
