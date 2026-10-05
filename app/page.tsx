'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Prediction, TournamentMatch, TournamentPrediction, TournamentSettings, TournamentTeam, User } from '@/types';

export default function Home() {
  const [tab, setTab] = useState('current');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [tournamentPredictions, setTournamentPredictions] = useState<TournamentPrediction[]>([]);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [dismissedTournamentWinnerId, setDismissedTournamentWinnerId] = useState<string | null>(null);
  const [landingMusicOn, setLandingMusicOn] = useState(false);
  const [landingTrackIndex, setLandingTrackIndex] = useState(0);
  const landingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [predictionSort, setPredictionSort] = useState<'name' | 'number'>('number');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [submitUserId, setSubmitUserId] = useState('');
  const [submitPin, setSubmitPin] = useState('');
  const [submitNumber, setSubmitNumber] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitChampionTeamId, setSubmitChampionTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [infoImageOpen, setInfoImageOpen] = useState(false);
  const [dismissedWinnerEventId, setDismissedWinnerEventId] = useState<string | null>(null);
  const landingBannerRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    const [{ data: u }, { data: e }, { data: p }, { data: t }, { data: tp }, { data: tm }, { data: ts }] = await Promise.all([
      supabase.from('users').select('id,name,nickname,avatar_url,created_at').order('name'),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*,users(id,name,nickname,avatar_url,created_at)'),
      supabase.from('tournament_teams').select('*,team_members(*,users(id,name,nickname,avatar_url,created_at))').order('created_at'),
      supabase.from('tournament_predictions').select('*,users(id,name,nickname,avatar_url,created_at),team:tournament_teams(id,name,status,created_at)').order('created_at'),
      supabase.from('tournament_matches').select('*,team1:tournament_teams!tournament_matches_team1_id_fkey(*),team2:tournament_teams!tournament_matches_team2_id_fkey(*)').order('round').order('match_order'),
      supabase.from('tournament_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    setUsers(u || []);
    setEvents(e || []);
    setPreds((p as any) || []);
    setTeams((t as any) || []);
    setTournamentPredictions((tp as TournamentPrediction[]) || []);
    setTournamentMatches((tm as TournamentMatch[]) || []);
    setTournamentSettings((ts as TournamentSettings | null) || null);
  }

  useEffect(() => {
    load();

    const getTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'landing' || hash === 'users' || hash === 'history' || hash === 'current') {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_settings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_predictions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, load)
      .subscribe();

    return () => {
      window.removeEventListener('hashchange', getTabFromHash);
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (tab !== 'landing') return;

    let scrollFrame = window.requestAnimationFrame(() => {
      if (landingBannerRef.current) {
        const top = landingBannerRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: 'auto' });
      }
    });

    let frame = 0;
    const updateParallax = () => {
      if (!landingBannerRef.current) return;
      const rect = landingBannerRef.current.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const offset = (rect.top - viewportCenter) * -0.12;
      landingBannerRef.current.style.setProperty('--landing-parallax-y', String(offset) + 'px');
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [tab]);

  const landingMusicSources = ['/landing-track-1.mp3', '/landing-track-2.mp3'];

  useEffect(() => {
    const audio = landingAudioRef.current;
    if (!audio) return;

    if (tab !== 'landing' || !landingMusicOn) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      // Browsers may block autoplay until the user interacts with the page.
    });
  }, [tab, landingMusicOn, landingTrackIndex]);

  const active = events.find((e) => e.status === 'active');
  const latestClosedEvent = events.find((e) => e.status === 'closed' && e.actual_result != null);
  const latestWinners = latestClosedEvent
    ? preds.filter(
        (p) =>
          p.event_id === latestClosedEvent.id &&
          Number(p.prediction) === Number(latestClosedEvent.actual_result)
      )
    : [];
  const showResultPopup =
    !active &&
    !!latestClosedEvent &&
    dismissedWinnerEventId !== latestClosedEvent.id;
  const current = active ? preds.filter((p) => p.event_id === active.id) : [];
  const submittedUserIds = new Set(current.map((p) => p.user_id));
  const availableUsers = users.filter((u) => !submittedUserIds.has(u.id));
  const remainingTournamentTeams = teams.filter((team) => team.status !== 'stopped');
  const tournamentOpen = teams.length > 1 && remainingTournamentTeams.length > 1;

  function getChampionPrediction(userId: string) {
    return tournamentPredictions.find((prediction) => prediction.user_id === userId);
  }
  const tournamentWinner = remainingTournamentTeams.length === 1 && teams.some((team) => team.status === 'stopped')
    ? remainingTournamentTeams[0]
    : null;
  const showTournamentWinnerPopup =
    tab === 'landing' &&
    !!tournamentWinner &&
    dismissedTournamentWinnerId !== tournamentWinner.id;

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

    if (tournamentOpen && !submitChampionTeamId) {
      setSubmitMessage('Hãy chọn đội bạn dự đoán sẽ vô địch.');
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

    if (tournamentOpen && submitChampionTeamId) {
      const championResult = await supabase.rpc('submit_tournament_prediction_with_pin', {
        p_user_id: submitUserId,
        p_team_id: submitChampionTeamId,
        p_pin_code: submitPin,
      });

      if (championResult.error) {
        setSubmitMessage('Dự đoán số đã được ghi nhận nhưng chưa lưu được đội vô địch: ' + championResult.error.message);
        await load();
        return;
      }
    }

    setSubmitMessage('Đã ghi nhận dự đoán. Bạn chỉ được gửi 1 lần cho sự kiện này.');
    setSubmitUserId('');
    setSubmitPin('');
    setSubmitNumber('');
    setSubmitChampionTeamId('');
    await load();
  }

  function toggleHistory(id: string) {
    setExpandedHistoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <>
      {showTournamentWinnerPopup && tournamentWinner && (
        <div className="tournament-winner-backdrop" role="dialog" aria-modal="true" aria-label="Chúc mừng đội vô địch">
          <div className="tournament-winner-celebration" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, index) => (
              <span className={'tournament-confetti tournament-confetti-' + (index + 1)} key={index} />
            ))}
          </div>
          <section className="tournament-winner-popup">
            <button
              className="winner-popup-close"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setDismissedTournamentWinnerId(tournamentWinner.id)}
            >×</button>
            <div className="winner-trophy">🏆</div>
            <div className="winner-kicker">GIẢI ĐẤU FAM - TIMES</div>
            <h2>Chúc mừng nhà vô địch!</h2>
            <div className="tournament-winner-team-name">{tournamentWinner.name}</div>
            <div className="tournament-winner-members">
              {(tournamentWinner.team_members || []).map((member) => (
                <div className="tournament-winner-member" key={member.id}>
                  <img src={member.users?.avatar_url || '/avatar.svg'} alt={member.users?.name || 'Thành viên'} />
                  <span>{member.users?.name || 'Thành viên'}</span>
                </div>
              ))}
            </div>
            <button
              className="btn winner-popup-button"
              type="button"
              onClick={() => setDismissedTournamentWinnerId(tournamentWinner.id)}
            >
              Tuyệt vời!
            </button>
          </section>
        </div>
      )}

      {infoImageOpen && tournamentSettings?.info_image_url && (
        <div className="tournament-info-lightbox" role="dialog" aria-modal="true" aria-label="Thông tin giải đấu">
          <button type="button" className="tournament-info-lightbox-backdrop" aria-label="Đóng ảnh" onClick={() => setInfoImageOpen(false)} />
          <div className="tournament-info-lightbox-content">
            <button type="button" className="winner-popup-close" aria-label="Đóng ảnh" onClick={() => setInfoImageOpen(false)}>×</button>
            <img src={tournamentSettings.info_image_url} alt="Thông tin giải đấu phóng to" />
          </div>
        </div>
      )}

      {showResultPopup && latestClosedEvent && (
        <div
          className={'winner-popup-backdrop ' + (latestWinners.length === 0 ? 'no-winner-backdrop' : '')}
          role="dialog"
          aria-modal="true"
          aria-label={latestWinners.length > 0 ? 'Thông báo người trúng giải' : 'Thông báo kết quả không có người trúng giải'}
        >
          {latestWinners.length > 0 ? (
            <div className="winner-celebration" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, index) => (
                <span className={'confetti-piece confetti-' + (index + 1)} key={index} />
              ))}
            </div>
          ) : (
            <div className="rain-celebration" aria-hidden="true">
              {Array.from({ length: 42 }).map((_, index) => (
                <span className={'rain-drop rain-' + (index + 1)} key={index} />
              ))}
            </div>
          )}

          <section className={'winner-popup ' + (latestWinners.length === 0 ? 'no-winner-popup' : '')}>
            <button
              className="winner-popup-close"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setDismissedWinnerEventId(latestClosedEvent.id)}
            >
              ×
            </button>

            {latestWinners.length > 0 ? (
              <>
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
              </>
            ) : (
              <>
                <div className="no-winner-icon">☔</div>
                <div className="winner-kicker no-winner-kicker">KẾT QUẢ SỰ KIỆN</div>
                <h2>Tiếc quá, chưa có ai trúng giải!</h2>
                <div className="winner-event-name">{latestClosedEvent.title}</div>

                <div className="winner-result no-winner-result">
                  <span>Kết quả</span>
                  <strong>{formatTwoDigits(latestClosedEvent.actual_result)}</strong>
                </div>

                <div className="no-winner-message">
                  Không có người tham gia nào dự đoán đúng con số này.
                  <br />
                  Hẹn mọi người ở sự kiện tiếp theo!
                </div>
              </>
            )}

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
        <a className={'tab ' + (tab === 'landing' ? 'active' : '')} href="#landing" aria-label="Giải đấu" onClick={() => setLandingMusicOn(true)}>
          <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v4a6 6 0 0 1-12 0z" /><path d="M8 13h8M10 17h4M9 21h6" /><path d="M4 5H2v2a4 4 0 0 0 4 4M20 5h2v2a4 4 0 0 1-4 4" /></svg>
          <span>Giải đấu</span>
        </a>
        <a className={'tab ' + (tab === 'current' ? 'active' : '')} href="#current" aria-label="Dự đoán hiện tại">
          <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 3l8 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-3v6h-5A1.5 1.5 0 0 1 4 19.5z" /></svg>
          <span>Dự đoán</span>
        </a>
        <a className={'tab ' + (tab === 'users' ? 'active' : '')} href="#users" aria-label="Người tham gia">
          <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.7-3.5 3-5.5 6.5-5.5s5.8 2 6.5 5.5" /><path d="M18 8.5a2.7 2.7 0 0 1 2.5 2.7M19.5 15.5c1.1.6 1.8 1.6 2.1 3" /></svg>
          <span>Người chơi</span>
        </a>
        <a className={'tab ' + (tab === 'history' ? 'active' : '')} href="#history" aria-label="Lịch sử">
          <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h14M5 12h14M5 16.5h9" /><circle cx="18.2" cy="16.4" r="3.1" /><path d="M18.2 14.7v1.9l1.2.8" /></svg>
          <span>Lịch sử</span>
        </a>
      </nav>
      {tab === 'landing' && (
        <section className="landing-page">
          <div className="landing-banner" ref={landingBannerRef}>
            <div className="landing-banner-media" aria-hidden="true">
              <video autoPlay muted loop playsInline preload="auto">
                <source src="/fam-times-bg-no-text-web.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="landing-banner-overlay" />
            <div className="landing-banner-content">
              <div className="landing-kicker">FAM - TIMES</div>
              <h2>{tournamentSettings?.title || 'GIẢI ĐẤU'}</h2>
              <p>{tournamentSettings?.subtitle || 'Chơi game bằng thực lực!'}</p>
              <div className="landing-banner-actions">
                <a className="btn landing-banner-button" href="#current">Tham gia dự đoán</a>
                <button
                  className={'landing-music-toggle ' + (landingMusicOn ? 'is-playing' : '')}
                  type="button"
                  onClick={() => {
                    const next = !landingMusicOn;
                    setLandingMusicOn(next);
                    if (next) landingAudioRef.current?.play().catch(() => undefined);
                  }}
                >
                  <span>{landingMusicOn ? '♫' : '♪'}</span>
                  {landingMusicOn ? 'Đang phát nhạc' : 'Bật nhạc nền'}
                </button>
                <audio
                  ref={landingAudioRef}
                  src={landingMusicSources[landingTrackIndex]}
                  preload="auto"
                  onEnded={() => setLandingTrackIndex((current) => (current + 1) % landingMusicSources.length)}
                />
              </div>
            </div>
          </div>

          {tournamentSettings?.info_image_url && (
            <section className="panel tournament-info-panel">
              <div className="landing-section-heading">
                <div>
                  <div className="landing-kicker">THÔNG TIN</div>
                  <h2 className="section-title">Thông tin giải đấu</h2>
                </div>
              </div>
              <button
                type="button"
                className="tournament-info-image-wrap tournament-info-image-button"
                onClick={() => setInfoImageOpen(true)}
                aria-label="Phóng to thông tin giải đấu"
              >
                <img src={tournamentSettings.info_image_url} alt="Thông tin giải đấu" />
              </button>
            </section>
          )}

          <div className="panel landing-intro">
            <div className="landing-section-heading">
              <div>
                <div className="landing-kicker">BẢNG ĐẤU</div>
                <h2 className="section-title">Các đội thi đấu</h2>
              </div>
              <div className="landing-team-counter">{teams.length} đội</div>
            </div>

            {teams.length === 0 ? (
              <div className="landing-empty">Chưa có đội thi đấu.</div>
            ) : (
              <div className="tournament-team-grid">
                {teams.map((team) => (
                  <article className={'tournament-team-card ' + (team.status === 'stopped' ? 'is-stopped' : '')} key={team.id}>
                    {team.status === 'stopped' && <div className="tournament-stopped-overlay"><span>DỪNG BƯỚC</span></div>}
                    <div className="tournament-team-card-head">
                      <span className={'tournament-status-badge ' + team.status}>
                        {team.status === 'stopped' ? 'Dừng bước' : team.status === 'advanced' ? 'Đi tiếp' : 'Đang thi đấu'}
                      </span>
                      <h3>{team.name}</h3>
                    </div>
                    <div className="tournament-team-members">
                      {(team.team_members || []).map((member) => (
                        <div className="tournament-team-member" key={member.id}>
                          <img src={member.users?.avatar_url || '/avatar.svg'} alt={member.users?.name || 'Thành viên'} />
                          <div>
                            <b>{member.users?.name || 'Thành viên'}</b>
                            <span>{member.users?.nickname || '—'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          {tournamentMatches.length > 0 && (
            <section className="panel tournament-bracket-panel">
              <div className="landing-section-heading">
                <div>
                  <div className="landing-kicker">SƠ ĐỒ THI ĐẤU</div>
                  <h2 className="section-title">Các cặp đấu</h2>
                </div>
              </div>
              <div className="tournament-bracket-scroll">
                <div className="tournament-bracket">
                  {(['round_of_16','quarterfinal','semifinal','final'] as TournamentMatch['round'][]).map((round) => {
                    const roundMatches = tournamentMatches.filter((match) => match.round === round).sort((a,b) => a.match_order - b.match_order);
                    if (!roundMatches.length) return null;
                    const roundTitle = round === 'round_of_16' ? 'VÒNG 1/8' : round === 'quarterfinal' ? 'TỨ KẾT' : round === 'semifinal' ? 'BÁN KẾT' : 'CHUNG KẾT';
                    return (
                      <div className={'tournament-bracket-round tournament-bracket-' + round} key={round}>
                        <div className="tournament-bracket-round-title">{roundTitle}</div>
                        <div className="tournament-bracket-matches">
                          {roundMatches.map((match) => (
                            <article className="tournament-bracket-match" key={match.id}>
                              <div className="tournament-bracket-match-label">TRẬN {match.match_order}</div>
                              <div className={'tournament-bracket-team ' + (match.score1 != null && match.score2 != null && match.score1 > match.score2 ? 'winner' : '')}>
                                <span>{match.team1?.name || 'Đội 1'}</span>
                                <b>{match.score1 != null ? match.score1 : '—'}</b>
                              </div>
                              <div className={'tournament-bracket-team ' + (match.score1 != null && match.score2 != null && match.score2 > match.score1 ? 'winner' : '')}>
                                <span>{match.team2?.name || 'Đội 2'}</span>
                                <b>{match.score2 != null ? match.score2 : '—'}</b>
                              </div>
                              {match.match_time && <div className="tournament-bracket-time">{new Date(match.match_time).toLocaleString('vi-VN')}</div>}
                            </article>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          </div>
        </section>
      )}

      {tab === 'current' && (
        <section className="panel">
          <h2 className={'section-title ' + (active ? 'status-live' : 'status-offline')}>
            <span className="section-status-dot" aria-hidden="true"></span>
            <span>{active?.title || 'Chưa có sự kiện đang mở'}</span>
          </h2>
          {active?.event_date && <p className="muted">Thời gian: {new Date(active.event_date).toLocaleString('vi-VN')}</p>}
          {active?.subtitle && (
            <div className="event-subtitle-display">
              <div className="event-subtitle-label">Thành viên thi đấu</div>
              <div className="event-subtitle-text">{active.subtitle}</div>
            </div>
          )}
          {active?.event_link && (
            <a className="event-live-link" href={active.event_link} target="_blank" rel="noreferrer">
              <span>Xem sự kiện đang diễn ra</span>
              <img className="event-live-link-icon" src="/live.svg" alt="LIVE" />
            </a>
          )}

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
                {tournamentOpen && (
                  <select
                    className="input tournament-champion-select"
                    value={submitChampionTeamId}
                    onChange={(e) => {
                      setSubmitChampionTeamId(e.target.value);
                      setSubmitMessage('');
                    }}
                    required
                  >
                    <option value="">Chọn đội dự đoán vô địch</option>
                    {remainingTournamentTeams.map((team) => (
                      <option value={team.id} key={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
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
                      {getChampionPrediction(p.user_id)?.team?.name && (
                        <small className="prediction-champion-badge" title="Đội dự đoán vô địch">
                          🏆 {getChampionPrediction(p.user_id)?.team?.name}
                        </small>
                      )}
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
                    {group.predictions.map((p) => (
                      <div className="prediction-number-person" key={p.id}>
                        <img
                          className="prediction-number-avatar"
                          src={p.users?.avatar_url || '/avatar.svg'}
                          alt={p.users?.name || 'Avatar'}
                        />
                        <div className="prediction-number-person-copy">
                          <span className="prediction-number-person-name">
                            {p.users?.name || 'Người tham gia'}
                          </span>
                          {getChampionPrediction(p.user_id)?.team?.name && (
                            <small className="prediction-champion-badge compact" title="Đội dự đoán vô địch">
                              🏆 {getChampionPrediction(p.user_id)?.team?.name}
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
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
        <section className="grid user-grid">
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
