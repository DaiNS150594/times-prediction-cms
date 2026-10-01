'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Prediction, User } from '@/types';

export default function Admin() {
  const [session, setSession] = useState<any>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('board');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventSubtitle, setEventSubtitle] = useState('');
  const [resultNumber, setResultNumber] = useState('');
  const [predictionSort, setPredictionSort] = useState<'name' | 'number'>('name');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserNick, setEditUserNick] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [editUserPin, setEditUserPin] = useState('');
  const [manualPredictionUserId, setManualPredictionUserId] = useState('');
  const [manualPredictionNumber, setManualPredictionNumber] = useState('');
  const [editingPredictionId, setEditingPredictionId] = useState<string | null>(null);
  const [editingPredictionValue, setEditingPredictionValue] = useState('');
  const [editingEventTitle, setEditingEventTitle] = useState(false);
  const [eventTitleDraft, setEventTitleDraft] = useState('');
  const [editingEventDate, setEditingEventDate] = useState(false);
  const [eventDateDraft, setEventDateDraft] = useState('');

  async function load() {
    const [{ data: u }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*,users(*)'),
    ]);
    setUsers(u || []);
    setEvents(e || []);
    const nextActive = (e || []).find((event: Event) => event.status === 'active');
    setEventLink(nextActive?.event_link || '');
    setEventSubtitle(nextActive?.subtitle || '');
    setPreds((p as any) || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: s } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => s.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function login(e: any) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  if (session === undefined) return null;

  if (!session) {
    return (


    <main className="wrap admin-page">
        <section className="panel login">
          <h1 className="section-title">FAM - TIMES CMS</h1>
          <form className="form" onSubmit={login}>
            <input className="input" placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn">Đăng nhập</button>
          </form>
        </section>
      </main>
    );
  }

  const active = events.find((e) => e.status === 'active');
  const activePreds = active ? preds.filter((p) => p.event_id === active.id) : [];
  const activePredUserIds = new Set(activePreds.map((p) => p.user_id));
  const availablePredictionUsers = users.filter((u) => !activePredUserIds.has(u.id));

  const sortedActivePreds = [...activePreds].sort((a, b) => {
    const nameA = (a.users?.name || '').toLocaleLowerCase('vi');
    const nameB = (b.users?.name || '').toLocaleLowerCase('vi');
    return nameA.localeCompare(nameB, 'vi');
  });

  const groupedActivePreds = Object.values(
    activePreds.reduce<Record<string, { number: number; predictions: Prediction[] }>>((groups, prediction) => {
      const key = String(Number(prediction.prediction));
      if (!groups[key]) {
        groups[key] = { number: Number(prediction.prediction), predictions: [] };
      }
      groups[key].predictions.push(prediction);
      return groups;
    }, {})
  ).sort((a, b) => a.number - b.number);

  async function addUser(e: any) {
    e.preventDefault();

    if (!/^\d{4}$/.test(pin)) {
      alert('PIN phải gồm đúng 4 chữ số.');
      return;
    }

    const { error } = await supabase.from('users').insert({
      name: name.trim(),
      nickname: nick.trim() || null,
      avatar_url: avatar.trim() || null,
      pin_code: pin,
    });

    if (error) {
      alert('Không thể thêm người tham gia: ' + error.message);
      return;
    }

    setName('');
    setNick('');
    setAvatar('');
    setPin('');
    load();
  }

  function startEditUser(user: User) {
    setEditingUserId(user.id);
    setEditUserName(user.name || '');
    setEditUserNick(user.nickname || '');
    setEditUserAvatar(user.avatar_url || '');
    setEditUserPin(user.pin_code || '');
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditUserName('');
    setEditUserNick('');
    setEditUserAvatar('');
    setEditUserPin('');
  }

  async function updateUser(id: string) {
    if (!editUserName.trim()) {
      alert('Tên người tham gia không được để trống.');
      return;
    }

    if (!/^\d{4}$/.test(editUserPin)) {
      alert('PIN phải gồm đúng 4 chữ số.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        name: editUserName.trim(),
        nickname: editUserNick.trim() || null,
        avatar_url: editUserAvatar.trim() || null,
        pin_code: editUserPin,
      })
      .eq('id', id);

    if (error) {
      alert('Không thể cập nhật người tham gia: ' + error.message);
      return;
    }

    cancelEditUser();
    load();
  }

  function startEditEventTitle() {
    if (!active) return;
    setEventTitleDraft(active.title);
    setEditingEventTitle(true);
  }

  function cancelEditEventTitle() {
    setEditingEventTitle(false);
    setEventTitleDraft('');
  }

  async function saveEventTitle() {
    if (!active) return;
    const nextTitle = eventTitleDraft.trim();

    if (!nextTitle) {
      alert('Tên sự kiện không được để trống.');
      return;
    }

    const { error } = await supabase
      .from('events')
      .update({ title: nextTitle })
      .eq('id', active.id);

    if (error) {
      alert('Không thể cập nhật tên sự kiện: ' + error.message);
      return;
    }

    cancelEditEventTitle();
    load();
  }

  function startEditEventDate() {
    if (!active) return;
    setEventDateDraft(active.event_date ? new Date(active.event_date).toISOString().slice(0, 16) : '');
    setEditingEventDate(true);
  }

  function cancelEditEventDate() {
    setEditingEventDate(false);
    setEventDateDraft('');
  }

  async function saveEventDate() {
    if (!active) return;
    const nextDate = eventDateDraft ? new Date(eventDateDraft).toISOString() : null;
    const { error } = await supabase
      .from('events')
      .update({ event_date: nextDate })
      .eq('id', active.id);

    if (error) {
      alert('Không thể cập nhật thời gian: ' + error.message);
      return;
    }

    cancelEditEventDate();
    load();
  }

  async function addManualPrediction(e: any) {
    e.preventDefault();
    if (!active) return;

    if (!manualPredictionUserId) {
      alert('Hãy chọn người tham gia.');
      return;
    }

    if (!/^\d{2}$/.test(manualPredictionNumber)) {
      alert('Dự đoán phải gồm đúng 2 chữ số, từ 00 đến 99.');
      return;
    }

    const { error } = await supabase.from('predictions').insert({
      event_id: active.id,
      user_id: manualPredictionUserId,
      prediction: Number(manualPredictionNumber),
    });

    if (error) {
      alert('Không thể thêm dự đoán: ' + error.message);
      return;
    }

    setManualPredictionUserId('');
    setManualPredictionNumber('');
    load();
  }

  function startEditPrediction(prediction: Prediction) {
    setEditingPredictionId(prediction.id);
    setEditingPredictionValue(formatTwoDigits(prediction.prediction));
  }

  function cancelEditPrediction() {
    setEditingPredictionId(null);
    setEditingPredictionValue('');
  }

  async function updatePrediction(id: string) {
    if (!/^\d{2}$/.test(editingPredictionValue)) {
      alert('Dự đoán phải gồm đúng 2 chữ số, từ 00 đến 99.');
      return;
    }

    const { error } = await supabase
      .from('predictions')
      .update({ prediction: Number(editingPredictionValue) })
      .eq('id', id);

    if (error) {
      alert('Không thể cập nhật dự đoán: ' + error.message);
      return;
    }

    cancelEditPrediction();
    load();
  }

  async function deletePrediction(prediction: Prediction) {
    const displayName = prediction.users?.name || 'người tham gia này';
    if (!confirm(`Xóa dự đoán của ${displayName}?`)) return;

    const { error } = await supabase.from('predictions').delete().eq('id', prediction.id);
    if (error) {
      alert('Không thể xóa dự đoán: ' + error.message);
      return;
    }

    if (editingPredictionId === prediction.id) cancelEditPrediction();
    load();
  }

  async function createEvent(e: any) {
    e.preventDefault();
    if (active) await supabase.from('events').update({ status: 'closed' }).eq('id', active.id);
    const nextLink = eventLink.trim();
    if (nextLink && !/^https?:\/\//i.test(nextLink)) {
      alert('Link sự kiện phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    const { error } = await supabase.from('events').insert({
      title,
      event_date: date ? new Date(date).toISOString() : null,
      event_link: nextLink || null,
      subtitle: eventSubtitle.trim() || null,
      status: 'active',
    });
    if (error) {
      alert('Không thể tạo sự kiện: ' + error.message);
      return;
    }
    setTitle('');
    setDate('');
    setEventLink('');
    load();
  }

  function formatTwoDigits(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return '—';
    return String(Number(value)).padStart(2, '0');
  }

  function toggleHistory(id: string) {
    setExpandedHistoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function deleteEvent(id: string, title: string) {
    if (!confirm(`Xóa sự kiện "${title}"? Toàn bộ dự đoán của sự kiện này cũng sẽ bị xóa.`)) return;

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      alert('Không thể xóa sự kiện: ' + error.message);
      return;
    }

    setExpandedHistoryIds((current) => current.filter((item) => item !== id));
    load();
  }

  async function closeEvent(id: string) {
    if (!/^\d{2}$/.test(resultNumber)) {
      alert('Kết quả phải gồm đúng 2 chữ số, từ 00 đến 99.');
      return;
    }

    if (!confirm(`Chốt kết quả ${resultNumber}? Sau khi chốt, sự kiện sẽ chuyển vào lịch sử.`)) return;

    const { error } = await supabase
      .from('events')
      .update({ actual_result: Number(resultNumber), status: 'closed' })
      .eq('id', id);

    if (error) {
      alert('Không thể chốt kết quả: ' + error.message);
      return;
    }

    setResultNumber('');
    load();
  }

  return (
    <>
      {editingUserId && (
        <div className="mobile-user-edit-backdrop" role="dialog" aria-modal="true" aria-label="Sửa thành viên">
          <div className="mobile-user-edit-modal">
            <div className="mobile-user-edit-heading">
              <div>
                <div className="mobile-user-edit-kicker">THÀNH VIÊN</div>
                <h2>Sửa thông tin</h2>
              </div>
              <button className="mobile-user-edit-close" type="button" onClick={cancelEditUser} aria-label="Đóng">×</button>
            </div>
            <img className="mobile-user-edit-avatar" src={editUserAvatar || '/avatar.svg'} alt={editUserName || 'Avatar'} />
            <div className="mobile-user-edit-form">
              <input className="input" placeholder="Tên" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
              <input className="input" placeholder="Nickname" value={editUserNick} onChange={(e) => setEditUserNick(e.target.value)} />
              <input className="input" placeholder="URL avatar" value={editUserAvatar} onChange={(e) => setEditUserAvatar(e.target.value)} />
              <input
                className="input pin-admin-input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="PIN 4 số"
                value={editUserPin}
                onChange={(e) => setEditUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div className="mobile-user-edit-actions">
              <button className="btn compact" type="button" onClick={() => updateUser(editingUserId)}>Lưu thay đổi</button>
              <button className="btn ghost compact" type="button" onClick={cancelEditUser}>Hủy</button>
            </div>
          </div>
        </div>
      )}
      <main className="wrap admin-page">
      <div className="topbar">
        <h1 className="section-title">FAM - TIMES CMS</h1>
        <div className="row">
          <a className="admin-link" href="/">← Frontend</a>
          <button className="btn danger" onClick={() => supabase.auth.signOut()}>
            Đăng xuất
          </button>
        </div>
      </div>

      <nav className="tabs">
        <button className={'tab ' + (tab === 'board' ? 'active' : '')} onClick={() => setTab('board')}>
          Bảng dự đoán
        </button>
        <button className={'tab ' + (tab === 'users' ? 'active' : '')} onClick={() => setTab('users')}>
          User
        </button>
        <button className={'tab ' + (tab === 'history' ? 'active' : '')} onClick={() => setTab('history')}>
          Kết quả / Lịch sử
        </button>
      </nav>

      {tab === 'board' && (
        <section className="panel">
          {active ? (
            <div className="admin-event-heading">
              <div className="admin-event-heading-main">
                {editingEventTitle ? (
                  <div className="admin-event-title-editor">
                    <input
                      className="input"
                      value={eventTitleDraft}
                      onChange={(e) => setEventTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEventTitle();
                        if (e.key === 'Escape') cancelEditEventTitle();
                      }}
                      autoFocus
                    />
                    <button className="btn compact" type="button" onClick={saveEventTitle}>Lưu</button>
                    <button className="btn ghost compact" type="button" onClick={cancelEditEventTitle}>Hủy</button>
                  </div>
                ) : (
                  <h2 className="section-title admin-event-title">Đang mở: {active.title}</h2>
                )}
                {editingEventDate ? (
                  <div className="admin-event-date-editor">
                    <input
                      className="input admin-event-date-input"
                      type="datetime-local"
                      value={eventDateDraft}
                      onChange={(e) => setEventDateDraft(e.target.value)}
                      autoFocus
                    />
                    <button className="btn compact" type="button" onClick={saveEventDate}>Lưu</button>
                    <button className="btn ghost compact" type="button" onClick={cancelEditEventDate}>Hủy</button>
                  </div>
                ) : (
                  <div className="admin-event-date-row">
                    <span>{active.event_date ? new Date(active.event_date).toLocaleString('vi-VN') : 'Chưa đặt thời gian'}</span>
                    <button className="btn ghost compact admin-event-title-edit" type="button" onClick={startEditEventDate}>
                      Sửa thời gian
                    </button>
                  </div>
                )}
              </div>
              {!editingEventTitle && (
                <button className="btn ghost compact admin-event-title-edit" type="button" onClick={startEditEventTitle}>
                  Sửa tên
                </button>
              )}
            </div>
          ) : (
            <h2 className="section-title">Tạo sự kiện mới</h2>
          )}
          {!active && (
            <form className="form two" onSubmit={createEvent}>
              <input className="input" required placeholder="Tên sự kiện" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              <input className="input event-link-input" type="url" placeholder="Link sự kiện đang diễn ra" value={eventLink} onChange={(e) => setEventLink(e.target.value)} />
              <div className="event-subtitle-create">
                <label htmlFor="event-subtitle">Thành viên thi đấu</label>
                <textarea
                  id="event-subtitle"
                  className="input"
                  rows={3}
                  placeholder="Nhập danh sách thành viên thi đấu"
                  value={eventSubtitle}
                  onChange={(e) => setEventSubtitle(e.target.value)}
                />
              </div>
              <button className="btn">Tạo bảng</button>
            </form>
          )}
          {active && (
            <>
              <div className="admin-event-link-box">
                <div>
                  <div className="admin-event-status-title">Link sự kiện đang diễn ra</div>
                  <div className="muted">Admin có thể thay đổi link bất cứ lúc nào trong khi sự kiện đang mở.</div>
                </div>
                <form className="admin-event-link-controls" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!active) return;
                  const nextLink = eventLink.trim();
                  if (nextLink && !/^https?:\/\//i.test(nextLink)) {
                    alert('Link sự kiện phải bắt đầu bằng http:// hoặc https://');
                    return;
                  }
                  const { error } = await supabase.from('events').update({ event_link: nextLink || null }).eq('id', active.id);
                  if (error) {
                    alert('Không thể cập nhật link sự kiện: ' + error.message);
                    return;
                  }
                  load();
                }}>
                  <input className="input" type="url" placeholder="https://..." value={eventLink} onChange={(e) => setEventLink(e.target.value)} />
                  <button className="btn compact" type="submit">Cập nhật link</button>
                </form>
              </div>

              <div className="admin-event-subtitle-box">
                <div className="admin-event-status-title">Thành viên thi đấu</div>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Nhập danh sách thành viên thi đấu"
                  value={eventSubtitle}
                  onChange={(e) => setEventSubtitle(e.target.value)}
                />
                <button
                  className="btn compact"
                  type="button"
                  onClick={async () => {
                    if (!active) return;
                    const { error } = await supabase
                      .from('events')
                      .update({ subtitle: eventSubtitle.trim() || null })
                      .eq('id', active.id);
                    if (error) {
                      alert('Không thể cập nhật thành viên thi đấu: ' + error.message);
                      return;
                    }
                    load();
                  }}
                >
                  Cập nhật
                </button>
              </div>

              <div className="admin-event-status">
                <div>
                  <div className="admin-event-status-title">Người chơi tự nhập dự đoán</div>
                  <div className="muted">Admin không cần nhập hộ. Hệ thống khóa mỗi người sau lần gửi đầu tiên.</div>
                </div>
                <div className="prediction-progress admin-progress">
                  <b>{activePreds.length}</b>/<span>{users.length}</span> đã dự đoán
                </div>
              </div>

              <form className="admin-manual-prediction" onSubmit={addManualPrediction}>
                <div className="admin-manual-copy">
                  <div className="admin-manual-title">Thêm dự đoán thủ công</div>
                  <div className="muted">Dùng khi người chơi nhắn tin nhờ admin nhập hộ.</div>
                </div>
                <div className="admin-manual-controls">
                  <select
                    className="input"
                    value={manualPredictionUserId}
                    onChange={(e) => setManualPredictionUserId(e.target.value)}
                    required
                  >
                    <option value="">Chọn người chưa dự đoán</option>
                    {availablePredictionUsers.map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.name}{u.nickname ? ' (' + u.nickname + ')' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input two-digit-input admin-manual-number"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    pattern="\d{2}"
                    placeholder="00–99"
                    value={manualPredictionNumber}
                    onChange={(e) => setManualPredictionNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    required
                  />
                  <button className="btn admin-manual-add" type="submit" disabled={availablePredictionUsers.length === 0}>
                    + Thêm
                  </button>
                </div>
              </form>

              <div className="result-entry-box">
                <div>
                  <div className="result-entry-title">Kết quả trúng giải</div>
                  <div className="muted">Khi có kết quả, nhập đúng 2 chữ số và chốt sự kiện.</div>
                </div>
                <div className="result-entry-controls">
                  <input
                    className="input two-digit-input admin-result-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    pattern="\d{2}"
                    placeholder="00–99"
                    value={resultNumber}
                    onChange={(e) => setResultNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  />
                  <button className="btn result-submit-btn" type="button" onClick={() => closeEvent(active.id)}>
                    Chốt kết quả
                  </button>
                </div>
              </div>

              <div className="prediction-toolbar">
                <div className="sort-meta">
                  <div className="sort-title">Sắp xếp bảng dự đoán</div>
                  <div className="sort-subtitle">{activePreds.length} người tham gia</div>
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
                <div className="prediction-name-list admin-prediction-name-list">
                  {sortedActivePreds.map((p) => (
                    <div className={'prediction-name-row admin-prediction-row ' + (editingPredictionId === p.id ? 'is-editing' : '')} key={p.id}>
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

                      <div className="admin-prediction-row-right">
                        <div className="prediction-number-pill">{formatTwoDigits(p.prediction)}</div>
                        <div className="admin-prediction-actions">
                          <button className="btn edit-btn compact" type="button" onClick={() => startEditPrediction(p)}>
                            Sửa
                          </button>
                          <button className="btn danger compact" type="button" onClick={() => deletePrediction(p)}>
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prediction-number-list admin-number-list">
                  {groupedActivePreds.map((group) => (
                    <div className="prediction-number-row" key={group.number}>
                      <div className="prediction-number-label">{formatTwoDigits(group.number)}</div>
                      <div className="prediction-number-avatars">
                        {group.predictions.map((p) => (
                          <button
                            className={'prediction-number-person admin-prediction-number-person ' + (editingPredictionId === p.id ? 'selected' : '')}
                            type="button"
                            key={p.id}
                            onClick={() => startEditPrediction(p)}
                          >
                            <img
                              className="prediction-number-avatar"
                              src={p.users?.avatar_url || '/avatar.svg'}
                              alt={p.users?.name || 'Avatar'}
                            />
                            <span className="prediction-number-person-name">
                              {p.users?.name || 'Người tham gia'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="prediction-number-count">{group.predictions.length} người</div>
                    </div>
                  ))}
                </div>
              )}

              {editingPredictionId && (() => {
                const editingPrediction = activePreds.find((p) => p.id === editingPredictionId);
                if (!editingPrediction) return null;

                return (
                  <div className="admin-prediction-editor">
                    <div className="admin-prediction-editor-person">
                      <img
                        className="prediction-mini-avatar"
                        src={editingPrediction.users?.avatar_url || '/avatar.svg'}
                        alt={editingPrediction.users?.name || 'Avatar'}
                      />
                      <div>
                        <b>{editingPrediction.users?.name}</b>
                        <div className="muted">{editingPrediction.users?.nickname || '—'}</div>
                      </div>
                    </div>
                    <input
                      className="input two-digit-input admin-editor-number"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      pattern="\d{2}"
                      value={editingPredictionValue}
                      onChange={(e) => setEditingPredictionValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    />
                    <div className="admin-prediction-editor-actions">
                      <button className="btn compact" type="button" onClick={() => updatePrediction(editingPrediction.id)}>
                        Lưu
                      </button>
                      <button className="btn danger compact" type="button" onClick={() => deletePrediction(editingPrediction)}>
                        Xóa
                      </button>
                      <button className="btn ghost compact" type="button" onClick={cancelEditPrediction}>
                        Hủy
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="panel">
          <h2 className="section-title">Danh sách người tham gia</h2>
          <form className="form two" onSubmit={addUser}>
            <input className="input" required placeholder="Tên" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Nickname" value={nick} onChange={(e) => setNick(e.target.value)} />
            <input className="input" placeholder="URL avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
            <input
              className="input pin-admin-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="PIN 4 số"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
            <button className="btn">Thêm user</button>
          </form>
          <div className="grid user-grid" style={{ marginTop: 18 }}>
            {users.map((u) => (
              <div
                className={'card person user-card ' + (editingUserId === u.id ? 'editing' : '')}
                key={u.id}
                onClick={() => {
                  if (editingUserId !== u.id) startEditUser(u);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (editingUserId !== u.id && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    startEditUser(u);
                  }
                }}
              >
                {editingUserId === u.id ? (
                  <>
                    <img
                      className="avatar"
                      src={editUserAvatar || '/avatar.svg'}
                      alt={editUserName || u.name}
                    />
                    <div className="user-card-body">
                      <div className="user-edit-form">
                        <input
                          className="input"
                          placeholder="Tên"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="Nickname"
                          value={editUserNick}
                          onChange={(e) => setEditUserNick(e.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="URL avatar"
                          value={editUserAvatar}
                          onChange={(e) => setEditUserAvatar(e.target.value)}
                        />
                        <input
                          className="input pin-admin-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          pattern="\d{4}"
                          placeholder="PIN 4 số"
                          value={editUserPin}
                          onChange={(e) => setEditUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      </div>
                      <div className="user-card-actions editing-actions">
                        <button className="btn compact" type="button" onClick={() => updateUser(u.id)}>
                          Lưu
                        </button>
                        <button className="btn ghost compact" type="button" onClick={cancelEditUser}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <img className="avatar" src={u.avatar_url || '/avatar.svg'} alt={u.name} />
                    <div className="user-card-body">
                      <div className="user-card-info">
                        <b className="user-name">{u.name}</b>
                        <div className="muted user-nickname">{u.nickname || '—'}</div>
                        <div className={'user-pin-badge ' + (u.pin_code ? '' : 'missing')}>
                          {u.pin_code ? 'PIN ' + u.pin_code : 'Chưa có PIN'}
                        </div>
                      </div>
                      <div className="user-card-actions">
                        <button className="btn edit-btn compact" type="button" onClick={() => startEditUser(u)}>
                          Sửa
                        </button>
                        <button
                          className="btn danger compact"
                          type="button"
                          onClick={async () => {
                            if (confirm('Xóa user?')) {
                              await supabase.from('users').delete().eq('id', u.id);
                              load();
                            }
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section className="panel">
          <h2 className="section-title">Lịch sử sự kiện</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Trạng thái</th>
                <th>Kết quả</th>
                <th>Dự đoán</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="history-event-title">{e.title}</div>
                    <div className="history-event-date">
                      {e.event_date ? new Date(e.event_date).toLocaleDateString('vi-VN') : '—'}
                    </div>
                  </td>
                  <td>
                    <span className="badge">{e.status}</span>
                  </td>
                  <td>{formatTwoDigits(e.actual_result)}</td>
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
                  <td>
                    <button
                      className="btn danger compact"
                      type="button"
                      onClick={() => deleteEvent(e.id, e.title)}
                    >
                      Xóa
                    </button>
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
