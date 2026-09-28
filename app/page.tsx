'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Prediction, User } from '@/types';

export default function Home() {
  const [tab, setTab] = useState('current');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [predictionSort, setPredictionSort] = useState<'name' | 'number'>('name');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);

  async function load() {
    const [{ data: u }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*,users(*)'),
    ]);
    setUsers(u || []);
    setEvents(e || []);
    setPreds((p as any) || []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('frontend-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const active = events.find((e) => e.status === 'active');
  const current = active ? preds.filter((p) => p.event_id === active.id) : [];
  const sortedCurrent = [...current].sort((a, b) => {
    if (predictionSort === 'number') {
      return Number(a.prediction) - Number(b.prediction);
    }

    const nameA = (a.users?.name || '').toLocaleLowerCase('vi');
    const nameB = (b.users?.name || '').toLocaleLowerCase('vi');
    return nameA.localeCompare(nameB, 'vi');
  });

  function toggleHistory(id: string) {
    setExpandedHistoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <span></span>
        <a className="admin-link" href="/admin">CMS Admin →</a>
      </div>

      <header className="hero">
        <p className="eyebrow">Realtime prediction board</p>
        <h1>FAM - TIMES</h1>
        <p>Chơi game bằng thực lực!</p>
      </header>

      <nav className="tabs">
        <button className={'tab ' + (tab === 'current' ? 'active' : '')} onClick={() => setTab('current')}>
          Dự đoán hiện tại
        </button>
        <button className={'tab ' + (tab === 'users' ? 'active' : '')} onClick={() => setTab('users')}>
          Người tham gia
        </button>
        <button className={'tab ' + (tab === 'history' ? 'active' : '')} onClick={() => setTab('history')}>
          Lịch sử
        </button>
      </nav>

      {tab === 'current' && (
        <section className="panel">
          <h2 className="section-title">{active?.title || 'Chưa có sự kiện đang mở'}</h2>
          {active?.event_date && <p className="muted">Thời gian: {new Date(active.event_date).toLocaleString('vi-VN')}</p>}
          <div className="prediction-toolbar public-sort-toolbar">
            <div className="sort-meta">
              <div className="sort-title">Sắp xếp bảng dự đoán</div>
              <div className="sort-subtitle">{current.length} người tham gia</div>
            </div>
            <div className="sort-toggle" role="group" aria-label="Sắp xếp bảng dự đoán">
              <button
                className={'sort-btn ' + (predictionSort === 'name' ? 'active' : '')}
                type="button"
                onClick={() => setPredictionSort('name')}
              >
                <span className="sort-icon">A–Z</span>
                <span>Theo tên</span>
              </button>
              <button
                className={'sort-btn ' + (predictionSort === 'number' ? 'active' : '')}
                type="button"
                onClick={() => setPredictionSort('number')}
              >
                <span className="sort-icon">1–9</span>
                <span>Theo số dự đoán</span>
              </button>
            </div>
          </div>

          <div className="grid">
            {sortedCurrent.map((p) => (
              <div className="card person" key={p.id}>
                <img className="avatar" src={p.users?.avatar_url || '/avatar.svg'} alt={p.users?.name || 'Avatar'} />
                <div>
                  <b>{p.users?.name}</b>
                  <div className="muted">{p.users?.nickname || ''}</div>
                </div>
                <div className="number">{p.prediction}</div>
              </div>
            ))}
          </div>
          {active?.actual_result != null && (
            <h3>
              Kết quả thực tế: <span className="number">{active.actual_result}</span>
            </h3>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="grid">
          {users.map((u) => (
            <article className="card person" key={u.id}>
              <img className="avatar big" src={u.avatar_url || '/avatar.svg'} alt={u.name} />
              <div>
                <h3>{u.name}</h3>
                <div className="muted">{u.nickname || '—'}</div>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'history' && (
        <section className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Ngày</th>
                <th>Kết quả</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {events
                .filter((e) => e.status === 'closed')
                .map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{e.event_date ? new Date(e.event_date).toLocaleString('vi-VN') : '—'}</td>
                    <td>
                      <b>{e.actual_result ?? '—'}</b>
                    </td>
                    <td>
                      <button
                        className={'history-toggle ' + (expandedHistoryIds.includes(e.id) ? 'expanded' : '')}
                        type="button"
                        onClick={() => toggleHistory(e.id)}
                        aria-expanded={expandedHistoryIds.includes(e.id)}
                      >
                        <span>{expandedHistoryIds.includes(e.id) ? 'Thu gọn' : 'Xem dự đoán'}</span>
                        <span className="history-toggle-icon">⌄</span>
                      </button>

                      {expandedHistoryIds.includes(e.id) && (
                        <div className="history-details">
                          {preds
                            .filter((p) => p.event_id === e.id)
                            .sort((a, b) => Number(a.prediction) - Number(b.prediction))
                            .map((p) => {
                              const isWinner =
                                e.actual_result != null && Number(p.prediction) === Number(e.actual_result);

                              return (
                                <div
                                  className={'history-prediction-row ' + (isWinner ? 'winner' : '')}
                                  key={p.id}
                                >
                                  <span className="history-player">
                                    {isWinner && <span className="winner-crown">🏆</span>}
                                    {p.users?.nickname || p.users?.name}
                                  </span>
                                  <span className="history-prediction-number">{p.prediction}</span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
