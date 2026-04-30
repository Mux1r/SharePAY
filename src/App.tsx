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
  alcoholPaid: number;
  drank: boolean;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '', paid: 0, alcoholPaid: 0, drank: true },
  ]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Non-payers groups
  const [nonPayerNormal, setNonPayerNormal] = useState<number>(0);
  const [nonPayerNoAlcohol, setNonPayerNoAlcohol] = useState<number>(0);
  const [nonPayerNoFood, setNonPayerNoFood] = useState<number>(0);

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { id: Date.now().toString(), name: '', paid: 0, alcoholPaid: 0, drank: true },
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
    const totalGeneral = participants.reduce((sum, p) => sum + (p.paid || 0), 0);
    const totalAlcohol = participants.reduce((sum, p) => sum + (p.alcoholPaid || 0), 0);
    const totalPaid = totalGeneral + totalAlcohol;
    
    const payerDrinkers = participants.filter(p => p.drank).length;
    const totalFoodEaters = participants.length + nonPayerNormal + nonPayerNoAlcohol;
    const totalDrinkers = payerDrinkers + nonPayerNormal + nonPayerNoFood;
    
    const perPersonGeneral = totalFoodEaters > 0 ? totalGeneral / totalFoodEaters : 0;
    const perPersonAlcohol = totalDrinkers > 0 ? totalAlcohol / totalDrinkers : 0;

    return {
      totalPaid,
      totalGeneral,
      alcoholTotalCost: totalAlcohol,
      totalFoodEaters,
      totalDrinkers,
      perPersonGeneral,
      perPersonAlcohol,
    };
  }, [participants, nonPayerNormal, nonPayerNoAlcohol, nonPayerNoFood]);

  const settlements = useMemo(() => {
    const rawResults: Settlement[] = [];
    
    const perDrinkerOwes = totals.perPersonGeneral + totals.perPersonAlcohol;
    const perNonDrinkerOwes = totals.perPersonGeneral;

    // 1. Calculate initial balances for all participants who actually appear in the list
    const participantsBalances = participants.map(p => {
      const personalObligation = p.drank ? perDrinkerOwes : perNonDrinkerOwes;
      const amountHePaid = (p.paid || 0) + (p.alcoholPaid || 0);
      return {
        id: p.id,
        name: p.name || `墊錢成員_${p.id.slice(-3)}`,
        balance: amountHePaid - personalObligation,
      };
    });

    // Pick the "Main Creditor" who is owed the most to be the hub for unpaid groups
    const sortedPotentialCreditors = [...participantsBalances].sort((a, b) => b.balance - a.balance);
    const mainCreditor = sortedPotentialCreditors[0];

    // 2. Unpaid Group members pay FULL amount to the Main Creditor
    if (mainCreditor) {
      if (nonPayerNormal > 0) {
        rawResults.push({
          from: '未付組(正常)',
          to: mainCreditor.name,
          amount: parseFloat(perDrinkerOwes.toFixed(2))
        });
        mainCreditor.balance -= (perDrinkerOwes * nonPayerNormal);
      }
      if (nonPayerNoAlcohol > 0) {
        rawResults.push({
          from: '未付組(沒酒)',
          to: mainCreditor.name,
          amount: parseFloat(perNonDrinkerOwes.toFixed(2))
        });
        mainCreditor.balance -= (perNonDrinkerOwes * nonPayerNoAlcohol);
      }
      if (nonPayerNoFood > 0) {
        rawResults.push({
          from: '未付組(沒吃)',
          to: mainCreditor.name,
          amount: parseFloat(totals.perPersonAlcohol.toFixed(2))
        });
        mainCreditor.balance -= (totals.perPersonAlcohol * nonPayerNoFood);
      }
    }

    // 3. Settle any remaining participant balances among themselves (including the updated mainCreditor)
    const creditors = participantsBalances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = participantsBalances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const c = creditors[cIdx];
      const d = debtors[dIdx];
      
      const amount = Math.min(Math.abs(d.balance), c.balance);
      
      if (amount > 0.01) {
        rawResults.push({ from: d.name, to: c.name, amount: parseFloat(amount.toFixed(2)) });
        d.balance += amount;
        c.balance -= amount;
      }
      
      if (Math.abs(d.balance) < 0.01) dIdx++;
      if (c.balance < 0.01) cIdx++;
    }

    // 4. Final grouping/formatting for UI display
    // Note: Since we want "Unpaid Group" to show count, we keep the flag
    return rawResults.map(res => {
      const isNormal = res.from === '未付組(正常)';
      const isNoAlcohol = res.from === '未付組(沒酒)';
      const isNoFood = res.from === '未付組(沒吃)';
      const isGroup = isNormal || isNoAlcohol || isNoFood;
      const count = isNormal ? nonPayerNormal : (isNoAlcohol ? nonPayerNoAlcohol : (isNoFood ? nonPayerNoFood : 1));
      
      return {
        ...res,
        count,
        isGroup,
        isSplit: false
      };
    });
  }, [participants, totals, nonPayerNormal, nonPayerNoAlcohol, nonPayerNoFood]);

  const resetAll = () => {
    if (confirm('確定要清除所有紀錄嗎？')) {
      setParticipants([{ id: '1', name: '', paid: 0, alcoholPaid: 0, drank: true }]);
      setNonPayerNormal(0);
      setNonPayerNoAlcohol(0);
      setNonPayerNoFood(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#DEDBD2] text-[#3A3A3A] font-sans pb-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto p-6 md:p-10 relative z-10">
        <header className="mb-14 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.2em] md:tracking-[0.4em] text-[#5A5A5A] uppercase">
              Share<span className="font-bold text-[#3A3A3A]">Pay</span>
            </h1>
            <div className="w-16 md:w-20 h-1 md:h-1.5 bg-[#9C7A7B] mx-auto mt-3 md:mt-4 opacity-60 rounded-full" />
          </motion.div>
        </header>

        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
            {/* Individual Payers Section - Widened proportion */}
            <section className="md:col-span-3 space-y-6 bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/80 shadow-md">
              <div className="flex items-center justify-between border-b border-[#7A8A95]/30 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#7A8A95] rounded-full" />
                  <h2 className="text-base font-black text-[#7A8A95] tracking-[0.25em] uppercase">墊錢成員</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`text-[10px] font-black transition-all flex items-center gap-1 uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                      isEditMode 
                        ? 'bg-[#9C7A7B] text-white border-[#9C7A7B] hover:bg-[#8B6A6B]' 
                        : 'bg-white/50 text-[#7A8A95] border-white/60 hover:text-[#5a6a75]'
                    }`}
                  >
                    <Trash2 size={12} /> {isEditMode ? '結束' : '刪除'}
                  </button>
                  <button
                    onClick={addParticipant}
                    className="text-[10px] font-black text-[#7A8A95] hover:text-[#5a6a75] transition-all flex items-center gap-1 uppercase tracking-widest bg-white/50 px-3 py-1.5 rounded-full border border-white/60 shadow-sm"
                  >
                    <Plus size={12} /> 新增
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <AnimatePresence>
                  {participants.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-2 group p-3 hover:bg-white/30 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={p.name}
                            placeholder="姓名"
                            onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                            className="w-full bg-transparent border-b-2 border-gray-300/40 focus:border-[#7A8A95] outline-none py-2 text-lg font-bold text-[#3A3A3A] placeholder:text-gray-300 transition-colors"
                          />
                        </div>
                        <div className="w-24 relative">
                          <span className="absolute left-0 bottom-2.5 text-gray-400 text-sm font-bold">$</span>
                          <input
                            type="number"
                            value={p.paid || ''}
                            onChange={(e) => updateParticipant(p.id, { paid: e.target.value === '' ? 0 : Number(e.target.value) })}
                            className="w-full bg-transparent border-b-2 border-gray-300/40 focus:border-[#7A8A95] outline-none py-2 pl-4 font-mono text-lg font-black text-[#3A3A3A] transition-colors"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <AnimatePresence mode="wait">
                            {isEditMode ? (
                              <motion.button
                                key="delete"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={() => removeParticipant(p.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all border shadow-sm text-[#9C7A7B] bg-[#9C7A7B]/10 border-[#9C7A7B]/20 hover:bg-[#9C7A7B]/20"
                                title="刪除"
                              >
                                <Trash2 size={14} />
                              </motion.button>
                            ) : (
                              <motion.button
                                key="beer"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={() => updateParticipant(p.id, { drank: !p.drank })}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border shadow-sm ${
                                  p.drank 
                                    ? 'text-[#9C7A7B] bg-[#9C7A7B]/20 border-[#9C7A7B]/40' 
                                    : 'text-gray-300 bg-white/30 border-transparent hover:border-gray-300'
                                }`}
                                title={p.drank ? '已喝' : '沒喝'}
                              >
                                <Beer size={14} className={p.drank ? 'fill-[#9C7A7B]' : ''} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Sub-row for alcohol portion */}
                      <div className="flex items-center justify-end gap-2 pr-14 -mt-1">
                         <div className="flex items-center gap-2 bg-[#9C7A7B]/5 px-3 py-1.5 rounded-full border border-[#9C7A7B]/10 shadow-sm">
                           <span className="text-[10px] font-black text-[#9C7A7B] uppercase tracking-wider">+ 酒水</span>
                           <div className="relative w-16">
                             <span className="absolute left-0 bottom-0.5 text-[10px] text-[#9C7A7B] font-bold">$</span>
                             <input
                               type="number"
                               value={p.alcoholPaid || ''}
                               onChange={(e) => updateParticipant(p.id, { alcoholPaid: e.target.value === '' ? 0 : Number(e.target.value) })}
                               className="w-full bg-transparent border-b border-[#9C7A7B]/20 focus:border-[#9C7A7B] outline-none pl-3 py-0.5 font-mono text-xs font-black text-[#9C7A7B]"
                             />
                           </div>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            {/* Group Counting & Alcohol Section */}
            <div className="md:col-span-2 space-y-8">
              <section className="bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/70 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-300/50 pb-3">
                  <h2 className="text-base font-black text-[#3A3A3A] tracking-[0.25em] uppercase">未付組/酒水</h2>
                  <div className="px-3 py-1 bg-white/70 rounded-lg border border-white shadow-inner">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-tighter">總頭數</span>
                    <span className="text-sm font-mono font-black text-[#3A3A3A]">{participants.length + nonPayerNormal + nonPayerNoAlcohol + nonPayerNoFood}人</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#9C7A7B]/5 rounded-2xl border border-[#9C7A7B]/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#9C7A7B] rounded-full" />
                      <span className="text-xs font-bold text-[#9C7A7B] uppercase tracking-widest">未付組(正常)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                         onClick={() => setNonPayerNormal(Math.max(0, nonPayerNormal - 1))}
                         className="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-sm font-bold shadow-sm"
                      >-</button>
                      <span className="font-mono text-base font-bold text-[#3A3A3A] w-8 text-center">{nonPayerNormal}</span>
                      <button 
                         onClick={() => setNonPayerNormal(nonPayerNormal + 1)}
                         className="w-7 h-7 rounded-lg bg-white border border-[#7A8A95] text-[#7A8A95] flex items-center justify-center hover:bg-[#7A8A95]/10 text-sm font-bold shadow-sm"
                      >+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#8A957A]/5 rounded-2xl border border-[#8A957A]/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#8A957A] rounded-full" />
                      <span className="text-xs font-bold text-[#8A957A] uppercase tracking-widest">未付組(沒酒)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setNonPayerNoAlcohol(Math.max(0, nonPayerNoAlcohol - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-sm font-bold shadow-sm"
                      >-</button>
                      <span className="font-mono text-base font-bold text-[#3A3A3A] w-8 text-center">{nonPayerNoAlcohol}</span>
                      <button 
                        onClick={() => setNonPayerNoAlcohol(nonPayerNoAlcohol + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#8A957A] text-[#8A957A] flex items-center justify-center hover:bg-[#8A957A]/10 text-sm font-bold shadow-sm"
                      >+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#7A8A95]/5 rounded-2xl border border-[#7A8A95]/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#7A8A95] rounded-full" />
                      <span className="text-xs font-bold text-[#7A8A95] uppercase tracking-widest">未付組(沒吃)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setNonPayerNoFood(Math.max(0, nonPayerNoFood - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-sm font-bold shadow-sm"
                      >-</button>
                      <span className="font-mono text-base font-bold text-[#3A3A3A] w-8 text-center">{nonPayerNoFood}</span>
                      <button 
                        onClick={() => setNonPayerNoFood(nonPayerNoFood + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#7A8A95] text-[#7A8A95] flex items-center justify-center hover:bg-[#7A8A95]/10 text-sm font-bold shadow-sm"
                      >+</button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#5A5A5A]">
                      <Beer size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">酒水總額</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-black text-[#9C7A7B]">${totals.alcoholTotalCost.toLocaleString()}</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">由成員墊付加總</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end pr-2 font-medium">
                <button 
                  onClick={resetAll}
                  className="text-[10px] font-bold text-[#9C7A7B] hover:text-[#8B6A6B] uppercase tracking-[0.25em] transition-colors underline underline-offset-8 decoration-current/20"
                >
                  重置所有資料
                </button>
              </div>
            </div>
          </div>

          <section className="bg-white/60 backdrop-blur-lg rounded-[2.5rem] p-8 md:p-12 border border-white shadow-xl text-[#3A3A3A]">
            <h2 className="text-base font-black text-[#3A3A3A] tracking-[0.25em] uppercase mb-10 border-b border-gray-300/50 pb-3">結算結果</h2>

            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#7A8A95] mb-2">總支出</p>
                    <div className="border-l-4 border-[#7A8A95] pl-4">
                      <p className="text-3xl font-mono font-black">${totals.totalPaid.toLocaleString()}</p>
                      <div className="flex gap-4 mt-1 text-[9px] font-black tracking-wider uppercase">
                        <span className="text-gray-400">一般 ${totals.totalGeneral.toFixed(0)}</span>
                        <span className="text-[#9C7A7B]">酒水 ${totals.alcoholTotalCost.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8A957A] mb-2">分擔人數</p>
                    <p className="text-3xl font-mono font-black border-l-4 border-[#8A957A] pl-4">{totals.totalFoodEaters}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-dashed border-gray-300 pb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">一般分擔 ({totals.totalFoodEaters}人)</span>
                    <span className="text-2xl font-mono font-black text-[#5A5A5A]">${totals.perPersonGeneral.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-300 pb-2">
                    <span className="text-xs font-bold text-[#9C7A7B] uppercase tracking-widest">酒錢分擔 ({totals.totalDrinkers}人)</span>
                    <span className="text-2xl font-mono font-black text-[#9C7A7B]">${totals.perPersonAlcohol.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-12 border-t border-gray-100">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1.5 h-6 bg-[#3A3A3A] rounded-full" />
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-[#3A3A3A]">
                    轉帳明細
                  </p>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {settlements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
                    {settlements.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-base py-5 border-b border-gray-100">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <span className={`font-black text-xs px-3 py-1 rounded-lg ${
                              s.from.includes('正常') 
                                ? 'bg-[#9C7A7B]/10 text-[#9C7A7B]' 
                                : s.from.includes('沒酒') 
                                ? 'bg-[#8A957A]/10 text-[#8A957A]' 
                                : s.from.includes('沒吃')
                                ? 'bg-[#7A8A95]/10 text-[#7A8A95]'
                                : 'bg-[#7A8A95]/10 text-[#7A8A95]'
                            }`}>
                              {s.from}
                              {s.isGroup && s.count > 1 && (
                                <span className="text-[10px] ml-1.5 opacity-60">x {s.count}人</span>
                              )}
                            </span>
                            <span className="text-gray-300 text-[10px]">▶</span>
                            <span className="font-black text-xs bg-gray-50 text-[#5A5A5A] px-3 py-1 rounded-lg border border-gray-200">
                              {s.to}
                            </span>
                          </div>
                          {s.isGroup && (
                            <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-2">
                              ※ 此組別為每人全額轉帳
                            </span>
                          )}
                          {!s.isGroup && (
                            <span className="text-[10px] text-[#7A8A95] font-bold tracking-wider uppercase mt-2">
                              ※ 墊錢成員間的差額結算
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-3xl text-[#3A3A3A]">${s.amount}</span>
                          {s.isGroup && <span className="block text-[9px] text-gray-400 font-black tracking-tighter uppercase -mt-1">整額 (FULL)</span>}
                          {!s.isGroup && <span className="block text-[9px] text-[#7A8A95] font-black tracking-tighter uppercase -mt-1">差額 (DIFF)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 text-xs font-bold tracking-[0.2em] bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 uppercase">
                    資料不足以結算
                  </div>
                )}
              </div>

              {settlements.length > 0 && (
                <button 
                  onClick={() => {
                    const text = settlements.map(s => {
                      if (s.isGroup && s.count > 1) {
                        return `・ ${s.from} (共${s.count}人) 每人 → ${s.to}: $${s.amount}`;
                      }
                      return `・ ${s.from} → ${s.to}: $${s.amount}`;
                    }).join('\n');
                    const report = `【SharePay 結算報告】\n\n總支出: $${totals.totalPaid}\n一般分擔人數: ${totals.totalFoodEaters}\n酒水分擔人數: ${totals.totalDrinkers}\n\n結算明細:\n${text}\n\n辛苦大家了！`;
                    navigator.clipboard.writeText(report);
                    alert('結算報告已成功複製！');
                  }}
                  className="w-full mt-10 bg-[#7A8A95] hover:bg-[#5a6a75] text-white rounded-[1.5rem] py-5 flex items-center justify-center gap-3 font-black text-sm tracking-widest uppercase transition-all shadow-xl active:scale-95"
                >
                  <Share2 size={18} /> 複製結算報告
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed -bottom-40 -left-40 w-[650px] h-[650px] bg-[#91A3B0]/5 rounded-full blur-[140px] -z-10" />
      <div className="fixed -top-40 -right-40 w-[650px] h-[650px] bg-[#B09192]/5 rounded-full blur-[140px] -z-10" />
    </div>
  );
}
