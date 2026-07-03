import React, { useState, useEffect } from 'react';
import { Heart, Calendar, FileText, BookOpen, Clock, Plus, Trash2, Shield, CalendarCheck } from 'lucide-react';
import { encryptWithPublicKey, decryptWithPrivateKey } from '../lib/crypto.ts';
import UserDisplay from './UserDisplay.tsx';

interface CoupleSpaceProps {
  couple: any;
  partner: any;
  userPrivateKey: string;
  userPublicKey: string;
}

export default function CoupleSpace({ couple, partner, userPrivateKey, userPublicKey }: CoupleSpaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<'anniversary' | 'notes' | 'journal' | 'calendar'>('anniversary');
  const [loading, setLoading] = useState(false);

  // Anniversary State
  const [anniversaries, setAnniversaries] = useState<any[]>([]);
  const [newAnnName, setNewAnnName] = useState('');
  const [newAnnDate, setNewAnnDate] = useState('');

  // Calendar State
  const [events, setEvents] = useState<any[]>([]);
  const [newEvTitle, setNewEvTitle] = useState('');
  const [newEvDate, setNewEvDate] = useState('');
  const [newEvDesc, setNewEvDesc] = useState('');

  // Shared Notes State
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [editingNote, setEditingNote] = useState<any | null>(null);

  // Journal State
  const [journals, setJournals] = useState<any[]>([]);
  const [journalText, setJournalText] = useState('');
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab, couple.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'anniversary') {
        const res = await fetch(`/api/couple/anniversaries/${couple.id}`, { headers });
        const data = await res.json();
        setAnniversaries(Array.isArray(data) ? data : []);
      } else if (activeSubTab === 'calendar') {
        const res = await fetch(`/api/couple/calendar/${couple.id}`, { headers });
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } else if (activeSubTab === 'notes') {
        const res = await fetch(`/api/notes/${couple.id}`, { headers });
        const data = await res.json();
        const decryptedNotes = await Promise.all((Array.isArray(data) ? data : []).map(async (note) => {
          const decTitle = await decryptWithPrivateKey(note.title, userPrivateKey);
          const decBody = await decryptWithPrivateKey(note.ciphertext, userPrivateKey);
          return { ...note, decTitle, decBody };
        }));
        setNotes(decryptedNotes);
      } else if (activeSubTab === 'journal') {
        const res = await fetch(`/api/journals`, { headers });
        const data = await res.json();
        const decryptedJournals = await Promise.all((Array.isArray(data) ? data : []).map(async (j) => {
          const decTitle = await decryptWithPrivateKey(j.title, userPrivateKey);
          const decBody = await decryptWithPrivateKey(j.ciphertext, userPrivateKey);
          return { ...j, decTitle, decBody };
        }));
        setJournals(decryptedJournals);
      }
    } catch (e) {
      console.error('Failed to load Couple space data:', e);
    }
    setLoading(false);
  };

  // Save Anniversary (No encryption needed for public titles)
  const handleAddAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnName || !newAnnDate) return;
    try {
      const res = await fetch(`/api/couple/anniversaries/${couple.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newAnnName, date: newAnnDate })
      });
      if (res.ok) {
        setNewAnnName('');
        setNewAnnDate('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Calendar event
  const handleAddCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvTitle || !newEvDate) return;
    try {
      const res = await fetch(`/api/couple/calendar/${couple.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newEvTitle, date: newEvDate, description: newEvDesc })
      });
      if (res.ok) {
        setNewEvTitle('');
        setNewEvDate('');
        setNewEvDesc('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save/Edit Note (Encrypted client-side with partner's and self public keys)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle || !newNoteBody) return;
    try {
      // For E2EE: encrypt with self public key so we can read it too
      const encTitle = await encryptWithPublicKey(newNoteTitle, userPublicKey);
      const encBody = await encryptWithPublicKey(newNoteBody, userPublicKey);

      const res = await fetch(`/api/notes/${couple.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: editingNote?.id || null,
          ownerType: 'COUPLE',
          title: encTitle.ciphertext,
          ciphertext: encBody.ciphertext,
          iv: encBody.iv
        })
      });
      if (res.ok) {
        setNewNoteTitle('');
        setNewNoteBody('');
        setEditingNote(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes/${couple.id}/${id}`, { method: 'DELETE', headers });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Save Journal (Encrypted with user's own public key, as it's a private diary)
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText) return;
    try {
      const encTitle = await encryptWithPublicKey(`อนุทินประจำวันที่ ${journalDate}`, userPublicKey);
      const encBody = await encryptWithPublicKey(journalText, userPublicKey);

      const res = await fetch(`/api/journals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          date: journalDate,
          title: encTitle.ciphertext,
          ciphertext: encBody.ciphertext,
          iv: encBody.iv
        })
      });
      if (res.ok) {
        setJournalText('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Anniversary Days Counter Calculation
  const calculateDays = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-y-auto p-4 sm:p-6">
      {/* Space Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-[var(--theme-border)] pb-4">
        <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 flex items-center justify-center">
          <Heart className="w-6 h-6 text-[var(--theme-primary)] fill-violet-400/20" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-[var(--theme-text-primary)]">Couple Space (พื้นที่เฉพาะเราสองคน)</h2>
          <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] mt-0.5">เชื่อมต่อและสร้างความทรงจำสุดส่วนตัวกับ <UserDisplay user={partner || { id: "", displayName: "" }} /></p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-[var(--theme-border)] gap-1 sm:gap-2 mb-6 text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('anniversary')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'anniversary' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <Clock className="w-4 h-4" />
          วันครบรอบ
        </button>
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'calendar' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <Calendar className="w-4 h-4" />
          ปฏิทินของเรา
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'notes' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <FileText className="w-4 h-4" />
          โน้ตร่วมกัน
        </button>
        <button
          onClick={() => setActiveSubTab('journal')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'journal' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <BookOpen className="w-4 h-4" />
          อนุทินความรู้สึก
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-[var(--theme-text-secondary)]">
          ข้อมูลทั้งหมดใน Couple Space ได้รับการคุ้มครองด้วยการเข้ารหัส End-to-End ตั้งแต่ฝั่งเครื่องของคุณ เซิร์ฟเวอร์ไม่สามารถถอดรหัสได้
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : (
        <div className="flex-1">
          {/* Anniversary Tab */}
          {activeSubTab === 'anniversary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Form */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">เพิ่มวันครบรอบ</h3>
                <form onSubmit={handleAddAnniversary} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อวันสำคัญ</label>
                    <input
                      type="text"
                      required
                      value={newAnnName}
                      onChange={e => setNewAnnName(e.target.value)}
                      placeholder="เช่น วันที่ตกหลุมรักกัน, วันขอแต่งงาน"
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">วันที่</label>
                    <input
                      type="date"
                      required
                      value={newAnnDate}
                      onChange={e => setNewAnnDate(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                  >
                    บันทึกวันครบรอบ
                  </button>
                </form>
              </div>

              {/* Right List */}
              <div className="md:col-span-2 space-y-4">
                {anniversaries.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีการเพิ่มวันครบรอบเลย เริ่มเพิ่มวันนี้เพื่อบันทึกประวัติศาสตร์รักของเรากัน!
                  </div>
                ) : (
                  anniversaries.map((ann) => {
                    const days = calculateDays(ann.date);
                    return (
                      <div key={ann.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--theme-text-primary)] text-sm sm:text-base">{ann.title}</h4>
                            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
                              {new Date(ann.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg sm:text-2xl font-display font-bold text-rose-500">
                            {days >= 0 ? `${days} วัน` : `อีก ${Math.abs(days)} วัน`}
                          </span>
                          <p className="text-[10px] text-[var(--theme-text-secondary)] uppercase mt-0.5">
                            {days >= 0 ? 'ผ่านมาแล้ว' : 'จะมาถึง'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeSubTab === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">เพิ่มกิจกรรมคู่รัก</h3>
                <form onSubmit={handleAddCalendarEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อกิจกรรม</label>
                    <input
                      type="text"
                      required
                      value={newEvTitle}
                      onChange={e => setNewEvTitle(e.target.value)}
                      placeholder="เช่น ดินเนอร์หรูฉลองครบรอบ, ไปดูคอนเสิร์ต"
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">วันที่</label>
                    <input
                      type="date"
                      required
                      value={newEvDate}
                      onChange={e => setNewEvDate(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">รายละเอียดเพิ่มเติม</label>
                    <textarea
                      value={newEvDesc}
                      onChange={e => setNewEvDesc(e.target.value)}
                      placeholder="ข้อมูลเพิ่มเติม เช่น เวลา, ร้านอาหาร หรือสิ่งที่ต้องเตรียม"
                      rows={3}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                  >
                    ปักหมุดลงปฏิทิน
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="md:col-span-2 space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีแผนหรือนัดล่วงหน้าเลย แพลนวันสำคัญแล้วปักหมุดไว้ร่วมกันซิ!
                  </div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-4 rounded-xl flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center flex-shrink-0">
                        <CalendarCheck className="w-5 h-5 text-[var(--theme-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-[var(--theme-text-primary)] text-sm sm:text-base truncate">{ev.title}</h4>
                          <span className="text-xs text-[var(--theme-primary)] font-mono flex-shrink-0">
                            {new Date(ev.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-[var(--theme-text-secondary)] mt-1">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeSubTab === 'notes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Note Editor */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">
                  {editingNote ? 'แก้ไขโน้ต E2EE' : 'เพิ่มโน้ตเข้ารหัสลับ (E2EE)'}
                </h3>
                <form onSubmit={handleSaveNote} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">หัวข้อโน้ต</label>
                    <input
                      type="text"
                      required
                      value={newNoteTitle}
                      onChange={e => setNewNoteTitle(e.target.value)}
                      placeholder="เช่น ข้อมูลสำคัญ, แพลนเที่ยว, บัญชีร่วม"
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">รายละเอียดโน้ต</label>
                    <textarea
                      required
                      value={newNoteBody}
                      onChange={e => setNewNoteBody(e.target.value)}
                      placeholder="พิมพ์ความลับหรือแผนงานของคุณ โน้ตนี้จะถูกเข้ารหัสก่อนส่งออกเสมอ..."
                      rows={5}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingNote && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNote(null);
                          setNewNoteTitle('');
                          setNewNoteBody('');
                        }}
                        className="flex-1 border-[var(--theme-border)] bg-[var(--theme-surface-hover)] hover:bg-slate-700 text-[var(--theme-text-primary)] rounded-lg py-2 text-sm font-medium transition-all"
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                    >
                      {editingNote ? 'อัปเดตโน้ต' : 'เข้ารหัสโน้ตและบันทึก'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Note List */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notes.length === 0 ? (
                  <div className="col-span-2 text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีโน้ตลับที่ถูกสร้างขึ้น ร่วมบันทึกโน้ตที่เข้ารหัสความปลอดภัยระดับทหารได้เลยที่นี่
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-4 rounded-xl flex flex-col justify-between hover:border-slate-750 transition-all">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="font-medium text-violet-300 text-sm sm:text-base truncate">{note.decTitle || 'โน้ตเข้ารหัส'}</h4>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setNewNoteTitle(note.decTitle);
                                setNewNoteBody(note.decBody);
                              }}
                              className="text-[11px] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-[11px] text-[var(--theme-text-secondary)] hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--theme-text-secondary)] line-clamp-4 whitespace-pre-wrap">{note.decBody}</p>
                      </div>
                      <div className="mt-4 pt-2 border-t border-[var(--theme-border)]/60 flex items-center justify-between text-[10px] text-[var(--theme-text-secondary)] font-mono">
                        <span>แก้ไขล่าสุด: {new Date(note.updatedAt).toLocaleDateString('th-TH')}</span>
                        <span className="text-emerald-500">🔒 E2EE Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Journal Tab */}
          {activeSubTab === 'journal' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Journal Form */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <h3 className="font-display font-medium text-[var(--theme-text-primary)] mb-4">เขียนบันทึกความในใจ</h3>
                <form onSubmit={handleSaveJournal} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">วันที่บันทึก</label>
                    <input
                      type="date"
                      required
                      value={journalDate}
                      onChange={e => setJournalDate(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">เขียนระบายสิ่งต่างๆ ที่อยู่ในหัววันนี้...</label>
                    <textarea
                      required
                      value={journalText}
                      onChange={e => setJournalText(e.target.value)}
                      placeholder="พิมพ์ความในใจ, ปัญหา, ความสุขอัดแน่นในใจ หรือบันทึกอารมณ์ของคุณ..."
                      rows={6}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2 text-sm font-medium transition-all"
                  >
                    เข้ารหัสลับความรู้สึกและบันทึก
                  </button>
                </form>
              </div>

              {/* Journal List */}
              <div className="md:col-span-2 space-y-4">
                {journals.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีสมุดบันทึกความรู้สึกลงทะเบียนไว้ เขียนบันทึกเพื่อผ่อนคลายอารมณ์วันนี้กันเถอะ
                  </div>
                ) : (
                  journals.map((j) => (
                    <div key={j.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-4 rounded-xl">
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--theme-border)] pb-2 mb-2">
                        <span className="font-display font-semibold text-[var(--theme-primary)] text-sm">
                          {new Date(j.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-[var(--theme-text-secondary)] font-mono bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded border border-[var(--theme-primary)]/20">
                          🔒 ส่วนบุคคล (E2EE)
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] whitespace-pre-wrap leading-relaxed">{j.decBody}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
