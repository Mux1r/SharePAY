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
    <div className="min-h-screen bg-[#DEDBD2] text-[#3A3A3A] font-sans pb-20 relative overflow-hidden">
      <div className="max-w-4xl mx-auto p-6 md:p-10 relative z-10">
        <header className="mb-14 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-4xl font-extralight tracking-[0.3em] text-[#5A5A5A] uppercase">
              Share<span className="font-bold text-[#3A3A3A]">Pay</span>
            </h1>
            <div className="w-16 h-1 bg-[#9C7A7B] mx-auto mt-3 opacity-60 rounded-full" />
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 xl:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Individual Payers Section */}
              <section className="space-y-6 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/70 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-300/50 pb-2">
                  <h2 className="text-sm font-black text-[#5A5A5A] tracking-[0.2em] uppercase">墊錢成員</h2>
                  <button
                    onClick={addParticipant}
                    className="text-xs font-black text-[#7A8A95] hover:text-[#5a6a75] transition-colors flex items-center gap-1 uppercase tracking-widest"
                  >
                    <Plus size={14} /> 新增
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {participants.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="text"
                          value={p.name}
                          placeholder="姓名"
                          onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                          className="w-24 bg-transparent border-b-2 border-gray-300/50 focus:border-[#7A8A95] outline-none py-1.5 text-base font-bold text-[#3A3A3A] placeholder:text-gray-400"
                        />
                        <div className="w-20 relative">
                          <span className="absolute left-0 bottom-2 text-gray-500 text-xs">$</span>
                          <input
                            type="number"
                            value={p.paid || ''}
                            onChange={(e) => updateParticipant(p.id, { paid: Number(e.target.value) })}
                            className="w-full bg-transparent border-b-2 border-gray-300/50 focus:border-[#7A8A95] outline-none py-1.5 pl-3 font-mono text-base font-bold text-[#3A3A3A]"
                          />
                        </div>
                        
                        <button
                          onClick={() => updateParticipant(p.id, { drank: !p.drank })}
                          className={`p-2 rounded-xl transition-all border ${
                            p.drank 
                              ? 'text-[#9C7A7B] bg-[#9C7A7B]/15 border-[#9C7A7B]/30' 
                              : 'text-gray-300 border-transparent hover:border-gray-300'
                          }`}
                          title={p.drank ? '已喝' : '沒喝'}
                        >
                          <Beer size={18} className={p.drank ? 'fill-[#9C7A7B]' : ''} />
                        </button>

                        {participants.length > 1 && (
                          <button
                            onClick={() => removeParticipant(p.id)}
                            className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              {/* Group Counting & Alcohol Section */}
              <div className="space-y-8">
                <section className="bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/70 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-300/50 pb-2">
                    <h2 className="text-sm font-black text-[#5A5A5A] tracking-[0.2em] uppercase">其他成員 / 酒水</h2>
                    <div className="px-3 py-1 bg-white/70 rounded-lg border border-white shadow-inner">
                      <span className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-tighter">總計</span>
                      <span className="text-sm font-mono font-black text-[#3A3A3A]">{totals.totalHeadcount}人</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5A5A5A] uppercase tracking-widest">沒出錢 - 喝酒</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setNonPayerDrinkers(Math.max(0, nonPayerDrinkers - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-sm font-bold shadow-sm"
                        >-</button>
                        <span className="font-mono text-base font-bold text-[#3A3A3A] w-6 text-center">{nonPayerDrinkers}</span>
                        <button 
                          onClick={() => setNonPayerDrinkers(nonPayerDrinkers + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#7A8A95] text-[#7A8A95] flex items-center justify-center hover:bg-[#7A8A95]/10 text-sm font-bold shadow-sm"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5A5A5A] uppercase tracking-widest">沒出錢 - 不喝</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setNonPayerNonDrinkers(Math.max(0, nonPayerNonDrinkers - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-sm font-bold shadow-sm"
                        >-</button>
                        <span className="font-mono text-base font-bold text-[#3A3A3A] w-6 text-center">{nonPayerNonDrinkers}</span>
                        <button 
                          onClick={() => setNonPayerNonDrinkers(nonPayerNonDrinkers + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#8A957A] text-[#8A957A] flex items-center justify-center hover:bg-[#8A957A]/10 text-sm font-bold shadow-sm"
                        >+</button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#5A5A5A]">
                        <Beer size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">酒水支出總額</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-0 bottom-2 text-gray-400 font-mono text-xs pb-0.5">$</span>
                        <input
                          type="number"
                          value={alcoholCost || ''}
                          onChange={(e) => setAlcoholCost(Number(e.target.value))}
                          className="bg-transparent border-b-2 border-gray-300/50 focus:border-[#9C7A7B] outline-none px-4 font-mono text-lg font-black w-24 text-right text-[#3A3A3A]"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pr-2 font-medium">
                  <button 
                    onClick={resetAll}
                    className="text-[10px] font-bold text-[#9C7A7B] hover:text-red-500 uppercase tracking-[0.25em] transition-colors underline underline-offset-8 decoration-current/20"
                  >
                    重置所有資料
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 xl:col-span-4">
            <section className="bg-white/60 backdrop-blur-lg rounded-3xl p-8 border border-white shadow-xl text-[#3A3A3A] sticky top-8">
              <h2 className="text-xs font-black tracking-[0.4em] uppercase mb-10 border-b-2 border-[#3A3A3A]/10 pb-2">結算結果</h2>

              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-x-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#7A8A95] mb-2">總花費</p>
                    <p className="text-2xl font-mono font-black border-l-4 border-[#7A8A95] pl-3">${totals.totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8A957A] mb-2">參與人數</p>
                    <p className="text-2xl font-mono font-black border-l-4 border-[#8A957A] pl-3">{totals.totalHeadcount}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-end border-b border-dashed border-gray-300 pb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">一般分分擔</span>
                    <span className="text-xl font-mono font-black text-[#5A5A5A] font-bold">${totals.perPersonGeneral.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-300 pb-2">
                    <span className="text-xs font-bold text-[#9C7A7B] uppercase tracking-widest">酒錢分擔 ({totals.totalDrinkers}人)</span>
                    <span className="text-xl font-mono font-black text-[#9C7A7B]">${totals.perPersonAlcohol.toFixed(1)}</span>
                  </div>
                </div>

                <div className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                    <span className="w-8 h-px bg-gray-200" /> 轉帳明細 <span className="w-8 h-px bg-gray-200" />
                  </p>
                  {settlements.length > 0 ? (
                    <div className="space-y-5">
                      {settlements.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-base py-2 border-b border-gray-100 italic">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#3A3A3A] not-italic">{s.from}</span>
                            <span className="text-gray-300 text-xs">→</span>
                            <span className="font-black text-[#3A3A3A] not-italic">{s.to}</span>
                          </div>
                          <span className="font-mono font-black text-[#3A3A3A] text-lg">${s.amount}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 text-xs font-bold tracking-[0.2em] bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 uppercase">
                      資料不足以結算
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
                    className="w-full mt-10 bg-[#7A8A95] hover:bg-[#5a6a75] text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95"
                  >
                    <Share2 size={16} /> 複製結算報告
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed -bottom-40 -left-40 w-[650px] h-[650px] bg-[#91A3B0]/5 rounded-full blur-[140px] -z-10" />
      <div className="fixed -top-40 -right-40 w-[650px] h-[650px] bg-[#B09192]/5 rounded-full blur-[140px] -z-10" />
    </div>
  );
}
