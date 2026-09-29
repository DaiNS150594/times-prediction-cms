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
  const [submitPin, setSubmitPin] = useState('');
  const [submitNumber, setSubmitNumber] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissedWinnerEventId, setDismissedWinnerEventId] = useState<string | null>(null);

  async function load() {
    const [{ data: u }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('users').select('id,name,nickname,avatar_url,created_at').order('name'),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*,users(id,name,nickname,avatar_url,created_at)'),
    ]);
    setUsers(u || []);
    setEvents(e || []);
    setPreds((p as any) || []);
  }

  useEffect(() => {
    load();

    const getTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'users' || hash === 'history' || hash === 'current') {
        setTab(hash);
      } else {
        setTab('current');
      }
    };

    getTabFromHash();
    window.addEventListener('hashchange', getTabFromHash);

    const ch = supabase
      .channel('frontend-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, load)
      .subscribe();

    return () => {
      window.removeEventListener('hashchange', getTabFromHash);
      supabase.removeChannel(ch);
    };
  }, []);

  const active = events.find((e) => e.status === 'active');
  const latestClosedEvent = events.find((e) => e.status === 'closed' && e.actual_result != null);
  const latestWinners = latestClosedEvent
    ? preds.filter(
        (p) =>
          p.event_id === latestClosedEvent.id &&
          Number(p.prediction) === Number(latestClosedEvent.actual_result)
      )
    : [];
  const showWinnerPopup =
    !active &&
    !!latestClosedEvent &&
    latestWinners.length > 0 &&
    dismissedWinnerEventId !== latestClosedEvent.id;
  const current = active ? preds.filter((p) => p.event_id === active.id) : [];
  const submittedUserIds = new Set(current.map((p) => p.user_id));
  const availableUsers = users.filter((u) => !submittedUserIds.has(u.id));

  const sortedCurrent = [...current].sort((a, b) => {
    const nameA = (a.users?.name || '').toLocaleLowerCase('vi');
    const nameB = (b.users?.name || '').toLocaleLowerCase('vi');
    return nameA.localeCompare(nameB, 'vi');
  });

  const groupedCurrent = Object.values(
    current.reduce<Record<string, { number: number; predictions: Prediction[] }>>((groups, prediction) => {
      const key = String(Number(prediction.prediction));
      if (!groups[key]) {
        groups[key] = { number: Number(prediction.prediction), predictions: [] };
      }
      groups[key].predictions.push(prediction);
      return groups;
    }, {})
  ).sort((a, b) => a.number - b.number);

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

    if (!/^\d{4}$/.test(submitPin)) {
      setSubmitMessage('PIN phải gồm đúng 4 chữ số.');
      return;
    }

    if (!/^\d{2}$/.test(submitNumber)) {
      setSubmitMessage('Dự đoán phải gồm đúng 2 chữ số, từ 00 đến 99.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc('submit_prediction_with_pin', {
      p_event_id: active.id,
      p_user_id: submitUserId,
      p_pin_code: submitPin,
      p_prediction: Number(submitNumber),
    });
    setSubmitting(false);

    if (error) {
      const message = error.message || '';
      if (message.includes('PIN không đúng')) {
        setSubmitMessage('PIN không đúng. Vui lòng kiểm tra lại.');
      } else if (message.includes('đã gửi dự đoán') || error.code === '23505') {
        setSubmitMessage('Bạn đã gửi dự đoán cho sự kiện này và không thể nhập lại.');
      } else if (message.includes('chưa được cấp PIN')) {
        setSubmitMessage('Tài khoản này chưa được admin cấp PIN.');
      } else if (message.includes('không còn mở')) {
        setSubmitMessage('Sự kiện đã đóng, không thể gửi dự đoán.');
      } else {
        setSubmitMessage('Không thể gửi dự đoán: ' + message);
      }
      await load();
      return;
    }

    setSubmitMessage('Đã ghi nhận dự đoán. Bạn chỉ được gửi 1 lần cho sự kiện này.');
    setSubmitUserId('');
    setSubmitPin('');
    setSubmitNumber('');
    await load();
  }

  function toggleHistory(id: string) {
    setExpandedHistoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <>
      {showWinnerPopup && latestClosedEvent && (
        <div className="winner-popup-backdrop" role="dialog" aria-modal="true" aria-label="Thông báo người trúng giải">
          <div className="winner-celebration" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <span className={'confetti-piece confetti-' + (index + 1)} key={index} />
            ))}
          </div>

          <section className="winner-popup">
            <button
              className="winner-popup-close"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setDismissedWinnerEventId(latestClosedEvent.id)}
            >
              ×
            </button>

            <div className="winner-trophy">🏆</div>
            <div className="winner-kicker">KẾT QUẢ SỰ KIỆN</div>
            <h2>Chúc mừng người trúng giải!</h2>
            <div className="winner-event-name">{latestClosedEvent.title}</div>

            <div className="winner-result">
              <span>Kết quả</span>
              <strong>{formatTwoDigits(latestClosedEvent.actual_result)}</strong>
            </div>

            <div className="winner-list">
              {latestWinners.map((winner) => (
                <div className="winner-person" key={winner.id}>
                  <img
                    className="winner-avatar"
                    src={winner.users?.avatar_url || '/avatar.svg'}
                    alt={winner.users?.name || 'Người trúng giải'}
                  />
                  <div>
                    <b>{winner.users?.name}</b>
                    <span>{winner.users?.nickname || 'Người chiến thắng'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn winner-popup-button"
              type="button"
              onClick={() => {
                setDismissedWinnerEventId(latestClosedEvent.id);
                window.location.hash = 'history';
              }}
            >
              Xem lịch sử sự kiện
            </button>
          </section>
        </div>
      )}

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

      <nav className="tabs" aria-label="Các khu vực">
        <a className={'tab ' + (tab === 'current' ? 'active' : '')} href="#current">
          Dự đoán hiện tại
        </a>
        <a className={'tab ' + (tab === 'users' ? 'active' : '')} href="#users">
          Người tham gia
        </a>
        <a className={'tab ' + (tab === 'history' ? 'active' : '')} href="#history">
          Lịch sử
        </a>
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
                  <div className="self-predict-subtitle">Mỗi người chỉ được gửi 1 lần • Xác nhận bằng PIN 4 số • Dự đoán 00–99</div>
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
                    setSubmitPin('');
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
                  className="input pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="PIN 4 số"
                  value={submitPin}
                  onChange={(e) => {
                    setSubmitPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setSubmitMessage('');
                  }}
                  required
                />
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

          {predictionSort === 'name' ? (
            <div className="prediction-name-list">
              {sortedCurrent.map((p) => (
                <div className="prediction-name-row" key={p.id}>
                  <div className="prediction-name-person">
                    <img
                      className="prediction-mini-avatar"
                      src={p.users?.avatar_url || '/avatar.svg'}
                      alt={p.users?.name || 'Avatar'}
                    />
                    <div className="prediction-name-copy">
                      <b>{p.users?.name}</b>
                      <span>{p.users?.nickname || '—'}</span>
                    </div>
                  </div>
                  <div className="prediction-number-pill">{formatTwoDigits(p.prediction)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="prediction-number-list">
              {groupedCurrent.map((group) => (
                <div className="prediction-number-row" key={group.number}>
                  <div className="prediction-number-label">{formatTwoDigits(group.number)}</div>
                  <div className="prediction-number-avatars">
                    {group.predictions.map((p) => {
                      const tooltip = p.users?.nickname
                        ? (p.users?.name || '') + ' • ' + p.users.nickname
                        : p.users?.name || 'Người tham gia';

                      return (
                        <span className="prediction-avatar-tooltip" data-tooltip={tooltip} key={p.id} tabIndex={0}>
                          <img
                            className="prediction-number-avatar"
                            src={p.users?.avatar_url || '/avatar.svg'}
                            alt={p.users?.name || 'Avatar'}
                          />
                        </span>
                      );
                    })}
                  </div>
                  <div className="prediction-number-count">{group.predictions.length} người</div>
                </div>
              ))}
            </div>
          )}
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
    </>
  );
}
