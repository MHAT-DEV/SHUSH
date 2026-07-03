import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, BarChart3, Edit3, Plus, Trash2, CheckCircle2, Shield, CircleDot } from 'lucide-react';
import Whiteboard from './Whiteboard.tsx';

interface BffSpaceProps {
  group: any;
  user: any;
}

export default function BffSpace({ group, user }: BffSpaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'polls' | 'whiteboard'>('checklist');
  const [loading, setLoading] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Polls state
  const [polls, setPolls] = useState<any[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Whiteboard canvas state
  const [canvasData, setCanvasData] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab, group.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'checklist') {
        const res = await fetch(`/api/checklist/${group.id}`, { headers });
        const data = await res.json();
        setChecklist(Array.isArray(data) ? data : []);
      } else if (activeSubTab === 'polls') {
        const res = await fetch(`/api/polls/${group.id}`, { headers });
        const data = await res.json();
        setPolls(Array.isArray(data) ? data : []);
      } else if (activeSubTab === 'whiteboard') {
        const res = await fetch(`/api/whiteboard/${group.id}`, { headers });
        const data = await res.json();
        setCanvasData(data.canvasData || '');
      }
    } catch (e) {
      console.error('Failed to load BFF Space data:', e);
    }
    setLoading(false);
  };

  // --- Checklist operations ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo) return;
    try {
      const res = await fetch(`/api/checklist/${group.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: newTodo })
      });
      if (res.ok) {
        setNewTodo('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTodo = async (itemId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/checklist/${group.id}/${itemId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isCompleted })
      });
      if (res.ok) {
        // Optimistic local state updates for instant visual feedback
        setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, isCompleted } : item));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Polls operations ---
  const handleAddOptionField = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const list = [...pollOptions];
    list[idx] = val;
    setPollOptions(list);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledOptions = pollOptions.filter(o => o.trim() !== '');
    if (!newPollQuestion || filledOptions.length < 2) return;

    try {
      const res = await fetch(`/api/polls/${group.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: newPollQuestion,
          options: filledOptions,
          expiresHours: 24
        })
      });
      if (res.ok) {
        setNewPollQuestion('');
        setPollOptions(['', '']);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/polls/${group.id}/${pollId}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ optionId })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Whiteboard operations ---
  const handleSaveWhiteboard = async (dataUrl: string) => {
    try {
      await fetch(`/api/whiteboard/${group.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ canvasData: dataUrl })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Get voters count for each option in a poll
  const getVotesForOption = (poll: any, optionId: string) => {
    const votes = poll.votes || {};
    return Object.values(votes).filter(v => v === optionId).length;
  };

  const getTotalVotes = (poll: any) => {
    return Object.keys(poll.votes || {}).length;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-y-auto p-4 sm:p-6">
      {/* Space Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-[var(--theme-border)] pb-4">
        <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 flex items-center justify-center">
          <Users className="w-6 h-6 text-[var(--theme-primary)]" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-[var(--theme-text-primary)]">{group.name} - BFF Space</h2>
          <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] mt-0.5">
            พื้นที่แชร์ความคิดเห็น ตารางงาน และกระดานวาดเขียนของเพื่อนสนิท ({group.members?.length} คน)
          </p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-[var(--theme-border)] gap-1 sm:gap-2 mb-6 text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'checklist' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <CheckSquare className="w-4 h-4" />
          เช็คลิสต์กลุ่ม
        </button>
        <button
          onClick={() => setActiveSubTab('polls')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'polls' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <BarChart3 className="w-4 h-4" />
          โหวต/โพลความคิดเห็น
        </button>
        <button
          onClick={() => setActiveSubTab('whiteboard')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'whiteboard' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <Edit3 className="w-4 h-4" />
          กระดานวาดเขียน
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : (
        <div className="flex-1">
          {/* Checklist View */}
          {activeSubTab === 'checklist' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">เพิ่มรายการเช็คลิสต์</h3>
                <form onSubmit={handleAddTodo} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">สิ่งที่ต้องทำ / ของต้องซื้อ</label>
                    <input
                      type="text"
                      required
                      value={newTodo}
                      onChange={e => setNewTodo(e.target.value)}
                      placeholder="เช่น ซื้อของปาร์ตี้, นัดซ้อมดนตรี"
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                  >
                    เพิ่มรายการเช็คลิสต์
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="md:col-span-2 space-y-3">
                {checklist.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ไม่มีเช็คลิสต์ค้างคาในกลุ่มนี้ มาร่วมสร้างเป้าหมายกลุ่มวันนี้กันเถอะ
                  </div>
                ) : (
                  checklist.map((todo) => (
                    <div
                      key={todo.id}
                      onClick={() => handleToggleTodo(todo.id, !todo.isCompleted)}
                      className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[var(--theme-surface)] transition-all select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-[var(--theme-primary)] focus:outline-none flex-shrink-0">
                          {todo.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/10" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-[var(--theme-border)] hover:border-violet-400 transition-all" />
                          )}
                        </button>
                        <span className={`text-sm text-[var(--theme-text-primary)] transition-all ${todo.isCompleted ? 'line-through text-[var(--theme-text-secondary)]' : ''}`}>
                          {todo.text}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--theme-text-secondary)] font-mono">
                        สร้างเมื่อ: {new Date(todo.createdAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Polls View */}
          {activeSubTab === 'polls' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Poll Creator */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">สร้างโพลกลุ่ม</h3>
                <form onSubmit={handleCreatePoll} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">หัวข้อคำถาม</label>
                    <input
                      type="text"
                      required
                      value={newPollQuestion}
                      onChange={e => setNewPollQuestion(e.target.value)}
                      placeholder="เช่น คืนนี้กินอะไรกันดี?, นัดเจอกันกี่โมงดี?"
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-[var(--theme-text-secondary)]">ตัวเลือกการโหวต</label>
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        required={idx < 2}
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        placeholder={`ตัวเลือกที่ ${idx + 1}`}
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-xs text-[var(--theme-primary)] hover:text-violet-300 font-medium mt-1 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มตัวเลือก
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                  >
                    สร้างโพลและเผยแพร่
                  </button>
                </form>
              </div>

              {/* Poll List */}
              <div className="md:col-span-2 space-y-4">
                {polls.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีการตั้งประชามติหรือผลโพลล่วงหน้า เริ่มต้นสร้างเป้าหมายการตัดสินใจเลย!
                  </div>
                ) : (
                  polls.map((poll) => {
                    const totalVotes = getTotalVotes(poll);
                    const userVotedOption = poll.votes?.[user.id] || null;

                    return (
                      <div key={poll.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl">
                        <div className="flex items-start justify-between border-b border-[var(--theme-border)] pb-3 mb-4">
                          <div>
                            <h4 className="font-medium text-[var(--theme-text-primary)] text-base sm:text-lg">{poll.question}</h4>
                            <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                              ผลโหวตทั้งหมด: {totalVotes} คะแนน • สิ้นสุดใน 24 ชั่วโมง
                            </p>
                          </div>
                          <span className="text-[10px] text-[var(--theme-text-secondary)] font-mono uppercase bg-[var(--theme-surface-hover)] px-2 py-0.5 rounded border border-[var(--theme-border)] flex items-center gap-1">
                            <CircleDot className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Poll
                          </span>
                        </div>

                        <div className="space-y-3">
                          {poll.options.map((opt: any) => {
                            const optVotes = getVotesForOption(poll, opt.id);
                            const percent = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                            const isSelected = userVotedOption === opt.id;

                            return (
                              <div
                                key={opt.id}
                                onClick={() => handleVote(poll.id, opt.id)}
                                className={`relative border rounded-lg p-3 cursor-pointer select-none transition-all ${isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-[var(--theme-border)] hover:border-[var(--theme-border)]'}`}
                              >
                                {/* Percentage visual fill */}
                                <div
                                  className="absolute top-0 left-0 bottom-0 bg-[var(--theme-primary)]/10 rounded-l-lg transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />

                                <div className="relative flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-violet-400 bg-[var(--theme-primary)]' : 'border-[var(--theme-border)]'}`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-[var(--theme-text-primary)] font-medium">{opt.optionText}</span>
                                  </div>
                                  <span className="font-mono text-xs text-[var(--theme-text-secondary)] font-bold">{optVotes} โหวต ({percent}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Whiteboard View */}
          {activeSubTab === 'whiteboard' && (
            <Whiteboard
              canvasData={canvasData}
              onSave={handleSaveWhiteboard}
              groupId={group.id}
            />
          )}
        </div>
      )}
    </div>
  );
}
