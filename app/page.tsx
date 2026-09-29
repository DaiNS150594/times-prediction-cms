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
  const [submitUserId, setSubmitUserId] = useState('');
  const [submitNumber, setSubmitNumber] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  const submittedUserIds = new Set(current.map((p) => p.user_id));
  const availableUsers = users.filter((u) => !submittedUserIds.has(u.id));

  const sortedCurrent = [...current].sort((a, b) => {
    if (predictionSort === 'number') {
      return Number(a.prediction) - Number(b.prediction);
    }

    const nameA = (a.users?.name || '').toLocaleLowerCase('vi');
    const nameB = (b.users?.name || '').toLocaleLowerCase('vi');
    return nameA.localeCompare(nameB, 'vi');
  });

  function formatTwoDigits(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return '—';
    return String(Number(value)).padStart(2, '0');
  }

  async function submitPrediction(e: any) {
    e.preventDefault();
    setSubmitMessage('');

    if (!active) {
      setSubmitMessage('Hiện chưa có sự kiện đang mở.');
      return;
    }

    if (!submitUserId) {
      setSubmitMessage('Hãy chọn tên của bạn.');
      return;
    }

    if (!/^\d{2}$/.test(submitNumber)) {
      setSubmitMessage('Dự đoán phải gồm đúng 2 chữ số, từ 00 đến 99.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('predictions').insert({
      event_id: active.id,
      user_id: submitUserId,
      prediction: Number(submitNumber),
    });
    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setSubmitMessage('Người này đã gửi dự đoán cho sự kiện hiện tại và không thể nhập lại.');
      } else {
        setSubmitMessage('Không thể gửi dự đoán: ' + error.message);
      }
      await load();
      return;
    }

    setSubmitMessage('Đã ghi nhận dự đoán. Bạn chỉ được gửi 1 lần cho sự kiện này.');
    setSubmitUserId('');
    setSubmitNumber('');
    await load();
  }

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

          {active && (
            <div className="self-predict-box">
              <div className="self-predict-head">
                <div>
                  <div className="self-predict-title">Gửi dự đoán của bạn</div>
                  <div className="self-predict-subtitle">Mỗi người chỉ được gửi 1 lần • Nhập đúng 2 chữ số (00–99)</div>
                </div>
                <div className="prediction-progress">
                  <b>{current.length}</b>/<span>{users.length}</span> đã dự đoán
                </div>
              </div>

              <form className="self-predict-form" onSubmit={submitPrediction}>
                <select
                  className="input"
                  value={submitUserId}
                  onChange={(e) => {
                    setSubmitUserId(e.target.value);
                    setSubmitMessage('');
                  }}
                  required
                >
                  <option value="">Chọn tên của bạn</option>
                  {availableUsers.map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name}{u.nickname ? ' (' + u.nickname + ')' : ''}
                    </option>
                  ))}
                </select>
                <input
                  className="input two-digit-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  pattern="\d{2}"
                  placeholder="VD: 05"
                  value={submitNumber}
                  onChange={(e) => {
                    setSubmitNumber(e.target.value.replace(/\D/g, '').slice(0, 2));
                    setSubmitMessage('');
                  }}
                  required
                />
                <button className="btn self-predict-btn" type="submit" disabled={submitting || availableUsers.length === 0}>
                  {submitting ? 'Đang gửi...' : 'Xác nhận dự đoán'}
                </button>
              </form>

              {submitMessage && <div className="prediction-submit-message">{submitMessage}</div>}
              {availableUsers.length === 0 && (
                <div className="prediction-submit-message success">Tất cả người tham gia đã gửi dự đoán.</div>
              )}
            </div>
          )}

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
                <div className="number">{formatTwoDigits(p.prediction)}</div>
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
                <th>Kết quả</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {events
                .filter((e) => e.status === 'closed')
                .map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="history-event-title">{e.title}</div>
                      <div className="history-event-date">
                        {e.event_date ? new Date(e.event_date).toLocaleDateString('vi-VN') : '—'}
                      </div>
                    </td>
                    <td>
                      <b>{formatTwoDigits(e.actual_result)}</b>
                    </td>
                    <td>
                      <button
                        className={'history-toggle ' + (expandedHistoryIds.includes(e.id) ? 'expanded' : '')}
                        type="button"
                        onClick={() => toggleHistory(e.id)}
                        aria-expanded={expandedHistoryIds.includes(e.id)}
                      >
                        <span>{expandedHistoryIds.includes(e.id) ? 'Thu gọn' : 'Xem dự đoán'}</span>
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
                                  <span className="history-prediction-number">{formatTwoDigits(p.prediction)}</span>
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
