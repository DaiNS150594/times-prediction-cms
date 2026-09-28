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
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState('');
  const [number, setNumber] = useState('');
  const [editingPredictionId, setEditingPredictionId] = useState<string | null>(null);
  const [editingPredictionValue, setEditingPredictionValue] = useState('');

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
      <main className="wrap">
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

  async function addUser(e: any) {
    e.preventDefault();
    await supabase.from('users').insert({ name, nickname: nick || null, avatar_url: avatar || null });
    setName('');
    setNick('');
    setAvatar('');
    load();
  }

  async function createEvent(e: any) {
    e.preventDefault();
    if (active) await supabase.from('events').update({ status: 'closed' }).eq('id', active.id);
    await supabase.from('events').insert({ title, event_date: date ? new Date(date).toISOString() : null, status: 'active' });
    setTitle('');
    setDate('');
    load();
  }

  async function addPred(e: any) {
    e.preventDefault();
    if (!active || !selected || number === '') return;
    await supabase.from('predictions').upsert(
      { event_id: active.id, user_id: selected, prediction: Number(number) },
      { onConflict: 'event_id,user_id' }
    );
    setNumber('');
    load();
  }

  async function updatePrediction(id: string) {
    if (editingPredictionValue.trim() === '') return;
    const value = Number(editingPredictionValue);
    if (Number.isNaN(value)) {
      alert('Vui lòng nhập một con số hợp lệ.');
      return;
    }

    const { error } = await supabase.from('predictions').update({ prediction: value }).eq('id', id);
    if (error) {
      alert('Không thể cập nhật dự đoán: ' + error.message);
      return;
    }

    setEditingPredictionId(null);
    setEditingPredictionValue('');
    load();
  }

  async function closeEvent(id: string) {
    const v = prompt('Nhập kết quả thực tế:');
    if (v === null) return;
    await supabase.from('events').update({ actual_result: Number(v), status: 'closed' }).eq('id', id);
    load();
  }

  return (
    <main className="wrap">
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
          <h2 className="section-title">{active ? 'Đang mở: ' + active.title : 'Tạo sự kiện mới'}</h2>
          {!active && (
            <form className="form two" onSubmit={createEvent}>
              <input className="input" required placeholder="Tên sự kiện" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              <button className="btn">Tạo bảng</button>
            </form>
          )}
          {active && (
            <>
              <form className="form two" onSubmit={addPred}>
                <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)} required>
                  <option value="">Chọn người</option>
                  {users.map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name} ({u.nickname})
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="Con số dự đoán"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
                <button className="btn">Lưu / cập nhật dự đoán</button>
              </form>

              <div className="grid" style={{ marginTop: 18 }}>
                {activePreds.map((p) => (
                  <div className="card person prediction-card" key={p.id}>
                    <img className="avatar" src={p.users?.avatar_url || '/avatar.svg'} alt={p.users?.name || 'Avatar'} />
                    <div className="prediction-user">
                      <b>{p.users?.name}</b>
                      <div className="muted">{p.users?.nickname}</div>
                    </div>

                    {editingPredictionId === p.id ? (
                      <div className="prediction-edit">
                        <input
                          className="input prediction-input"
                          type="number"
                          step="any"
                          autoFocus
                          value={editingPredictionValue}
                          onChange={(e) => setEditingPredictionValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updatePrediction(p.id);
                            if (e.key === 'Escape') {
                              setEditingPredictionId(null);
                              setEditingPredictionValue('');
                            }
                          }}
                        />
                        <div className="prediction-actions">
                          <button className="btn compact" type="button" onClick={() => updatePrediction(p.id)}>
                            Lưu
                          </button>
                          <button
                            className="btn ghost compact"
                            type="button"
                            onClick={() => {
                              setEditingPredictionId(null);
                              setEditingPredictionValue('');
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="prediction-value-wrap">
                        <div className="number">{p.prediction}</div>
                        <button
                          className="btn edit-btn compact"
                          type="button"
                          onClick={() => {
                            setEditingPredictionId(p.id);
                            setEditingPredictionValue(String(p.prediction));
                          }}
                        >
                          Sửa
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p>
                <button className="btn danger" onClick={() => closeEvent(active.id)}>
                  Chốt kết quả & lưu lịch sử
                </button>
              </p>
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
            <button className="btn">Thêm user</button>
          </form>
          <div className="grid" style={{ marginTop: 18 }}>
            {users.map((u) => (
              <div className="card person" key={u.id}>
                <img className="avatar" src={u.avatar_url || '/avatar.svg'} alt={u.name} />
                <div>
                  <b>{u.name}</b>
                  <div className="muted">{u.nickname}</div>
                </div>
                <button
                  className="btn danger"
                  style={{ marginLeft: 'auto' }}
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
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>
                    <span className="badge">{e.status}</span>
                  </td>
                  <td>{e.actual_result ?? '—'}</td>
                  <td>
                    {preds.filter((p) => p.event_id === e.id).map((p) => (
                      <div key={p.id}>
                        {p.users?.nickname || p.users?.name}: {p.prediction}
                      </div>
                    ))}
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
