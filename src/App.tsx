/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Beer, User, DollarSign, Calculator, RefreshCw, Share2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Participant {
  id: string;
  name: string;
  paid: number;
  drank: boolean;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '代付人 1', paid: 0, drank: true },
  ]);
  const [alcoholCost, setAlcoholCost] = useState<number>(0);
  
  // Non-payers groups
  const [nonPayerDrinkers, setNonPayerDrinkers] = useState<number>(0);
  const [nonPayerNonDrinkers, setNonPayerNonDrinkers] = useState<number>(0);

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { id: Date.now().toString(), name: `代付人 ${participants.length + 1}`, paid: 0, drank: true },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const totals = useMemo(() => {
    const totalPaid = participants.reduce((sum, p) => sum + p.paid, 0);
    const payerDrinkers = participants.filter(p => p.drank).length;
    const totalHeadcount = participants.length + nonPayerDrinkers + nonPayerNonDrinkers;
    const totalDrinkers = payerDrinkers + nonPayerDrinkers;
    
    const generalCost = Math.max(0, totalPaid - alcoholCost);
    
    const perPersonGeneral = totalHeadcount > 0 ? generalCost / totalHeadcount : 0;
    const perPersonAlcohol = totalDrinkers > 0 ? alcoholCost / totalDrinkers : 0;

    return {
      totalPaid,
      totalHeadcount,
      totalDrinkers,
      perPersonGeneral,
      perPersonAlcohol,
    };
  }, [participants, alcoholCost, nonPayerDrinkers, nonPayerNonDrinkers]);

  const settlements = useMemo(() => {
    const results: Settlement[] = [];
    
    const perDrinkerOwes = totals.perPersonGeneral + totals.perPersonAlcohol;
    const perNonDrinkerOwes = totals.perPersonGeneral;

    // Calculate individual balances for payers
    const balances = participants.map(p => {
      const personalObligation = p.drank ? perDrinkerOwes : perNonDrinkerOwes;
      return {
        name: p.name,
        balance: p.paid - personalObligation,
      };
    });

    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    // Add virtual debtors for the groups
    const groupDebtors = [
      { name: '未付組 (喝)', balance: -perDrinkerOwes * nonPayerDrinkers },
      { name: '未付組 (無)', balance: -perNonDrinkerOwes * nonPayerNonDrinkers }
    ].filter(g => g.balance < 0);

    const allDebtors = [...debtors, ...groupDebtors].sort((a, b) => a.balance - b.balance);

    const creditorsCopy = creditors.map(c => ({ ...c }));
    const debtorsCopy = allDebtors.map(d => ({ ...d }));

    let dIdx = 0, cIdx = 0;
    while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
      const d = debtorsCopy[dIdx];
      const c = creditorsCopy[cIdx];
      const amount = Math.min(Math.abs(d.balance), c.balance);
      
      if (amount > 0.01) {
        results.push({ from: d.name, to: c.name, amount: parseFloat(amount.toFixed(2)) });
        d.balance += amount;
        c.balance -= amount;
      }
      if (Math.abs(d.balance) < 0.01) dIdx++;
      if (c.balance < 0.01) cIdx++;
    }

    return results;
  }, [participants, totals, nonPayerDrinkers, nonPayerNonDrinkers]);

  const resetAll = () => {
    if (confirm('確定要清除所有紀錄嗎？')) {
      setParticipants([{ id: '1', name: '代付人 1', paid: 0 }]);
      setAlcoholCost(0);
      setNonPayerDrinkers(0);
      setNonPayerNonDrinkers(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-10 flex flex-wrap justify-between items-end gap-4">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-5xl font-black tracking-tighter text-black uppercase italic">
              Share<span className="text-blue-600">Pay</span>
            </h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">智能分帳結算系統</p>
          </motion.div>
          <button 
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-full transition-all"
          >
            <RefreshCw size={14} /> 清除資料
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            {/* Payers Section */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-2xl text-blue-600">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">誰先墊錢了？</h2>
                    <p className="text-xs text-gray-400 font-bold">登錄所有代付人的金額</p>
                  </div>
                </div>
                <button
                  onClick={addParticipant}
                  className="bg-black text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <Plus size={18} /> 新增代付
                </button>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {participants.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex flex-wrap items-end gap-4 p-5 bg-gray-50 rounded-3xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all"
                    >
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">姓名</label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none py-1 font-bold text-lg"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">金額</label>
                        <div className="relative">
                          <span className="absolute left-0 top-1 text-gray-400 font-bold">$</span>
                          <input
                            type="number"
                            value={p.paid || ''}
                            onChange={(e) => updateParticipant(p.id, { paid: Number(e.target.value) })}
                            className="w-full bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none py-1 pl-4 font-mono font-black text-xl"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => updateParticipant(p.id, { drank: !p.drank })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all border-2 ${
                          p.drank 
                            ? 'bg-amber-100 text-amber-600 border-amber-200' 
                            : 'bg-white text-gray-300 border-gray-100 grayscale hover:grayscale-0'
                        }`}
                      >
                        <Beer size={14} className={p.drank ? 'fill-amber-500' : ''} />
                        {p.drank ? '已喝酒' : '沒喝酒'}
                      </button>

                      {participants.length > 1 && (
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            {/* Non-Payers Section */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-gray-100 p-2 rounded-2xl text-gray-600">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">純跟團 (沒出錢)</h2>
                  <p className="text-xs text-gray-400 font-bold">直接統計人數，不用打名字</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Beer className="text-amber-500" size={20} />
                      <span className="font-black">有喝酒人數</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => setNonPayerDrinkers(Math.max(0, nonPayerDrinkers - 1))}
                      className="w-12 h-12 rounded-2xl bg-white border-2 border-amber-200 text-amber-500 font-black text-2xl flex items-center justify-center hover:bg-amber-100 transition-all"
                    >-</button>
                    <span className="text-4xl font-mono font-black">{nonPayerDrinkers}</span>
                    <button 
                      onClick={() => setNonPayerDrinkers(nonPayerDrinkers + 1)}
                      className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-2xl flex items-center justify-center hover:bg-amber-600 transition-all shadow-lg"
                    >+</button>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="text-blue-500" size={20} />
                      <span className="font-black">沒喝酒人數</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => setNonPayerNonDrinkers(Math.max(0, nonPayerNonDrinkers - 1))}
                      className="w-12 h-12 rounded-2xl bg-white border-2 border-blue-200 text-blue-500 font-black text-2xl flex items-center justify-center hover:bg-blue-100 transition-all"
                    >-</button>
                    <span className="text-4xl font-mono font-black">{nonPayerNonDrinkers}</span>
                    <button 
                      onClick={() => setNonPayerNonDrinkers(nonPayerNonDrinkers + 1)}
                      className="w-12 h-12 rounded-2xl bg-blue-500 text-white font-black text-2xl flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
                    >+</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-amber-500 text-white rounded-[2.5rem] p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Beer size={28} />
                <h2 className="text-2xl font-black">酒水消費額</h2>
              </div>
              <div className="relative">
                <DollarSign size={24} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="number"
                  value={alcoholCost || ''}
                  placeholder="輸入本次酒標總額"
                  onChange={(e) => setAlcoholCost(Number(e.target.value))}
                  className="w-full bg-white/10 hover:bg-white/20 focus:bg-white/20 border-2 border-white/30 rounded-2xl py-4 pl-10 pr-4 outline-none font-mono font-black text-3xl transition-all placeholder:text-white/30"
                />
              </div>
              <p className="text-sm mt-4 font-bold text-white/80">此金額將由有勾選「酒水」標籤或位於喝酒組的成員分擔。</p>
            </section>
          </div>

          <div className="lg:col-span-5">
            <section className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <Calculator className="text-green-400" size={24} />
                <h2 className="text-2xl font-black">結算明細</h2>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">總開銷</p>
                    <p className="text-2xl font-mono font-black text-green-400">${totals.totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">總人數</p>
                    <p className="text-2xl font-mono font-black">{totals.totalHeadcount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-5 rounded-3xl border border-white/10">
                    <span className="font-bold text-gray-400 text-sm">一般每人負擔</span>
                    <span className="text-xl font-mono font-black">${totals.perPersonGeneral.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-5 rounded-3xl border border-white/10">
                    <span className="font-bold text-amber-500 text-sm">酒錢每人負擔 ({totals.totalDrinkers}人)</span>
                    <span className="text-xl font-mono font-black text-amber-500">${totals.perPersonAlcohol.toFixed(1)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-4">轉帳路徑</p>
                  {settlements.length > 0 ? (
                    <div className="space-y-3">
                      {settlements.map((s, i) => (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={i}
                          className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-black text-sm">{s.from}</span>
                            <span className="text-white/20 text-xs">應付</span>
                            <span className="text-green-400 font-black text-sm">{s.to}</span>
                          </div>
                          <span className="font-mono font-black text-lg">${s.amount}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl text-gray-600 font-bold">
                      尚未產生結算結果
                    </div>
                  )}
                </div>

                {settlements.length > 0 && (
                  <button 
                    onClick={() => {
                      const text = settlements.map(s => `・ ${s.from} → ${s.to}: $${s.amount}`).join('\n');
                      const report = `【SharePay 結算報告】\n\n總支出: $${totals.totalPaid}\n總人數: ${totals.totalHeadcount}\n\n結算明細:\n${text}\n\n辛苦大家了！`;
                      navigator.clipboard.writeText(report);
                      alert('結算報告已成功複製！');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-3xl py-5 flex items-center justify-center gap-3 font-black text-lg transition-all active:scale-95 shadow-xl"
                  >
                    <Share2 size={20} /> 複製結算報告
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10" />
      <div className="fixed -top-40 -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
