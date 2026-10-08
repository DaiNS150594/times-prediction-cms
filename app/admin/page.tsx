'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Prediction, TournamentInfoImage, TournamentMatch, TournamentSettings, TournamentTeam, User } from '@/types';

export default function Admin() {
  const [session, setSession] = useState<any>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('board');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [matchRound, setMatchRound] = useState<TournamentMatch['round']>('quarterfinal');
  const [matchOrder, setMatchOrder] = useState('1');
  const [matchTeam1, setMatchTeam1] = useState('');
  const [matchTeam2, setMatchTeam2] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [tournamentTitle, setTournamentTitle] = useState('GIẢI ĐẤU');
  const [tournamentSubtitle, setTournamentSubtitle] = useState('Chơi game bằng thực lực!');
  const [tournamentInfoImageFile, setTournamentInfoImageFile] = useState<File | null>(null);
  const [tournamentInfoImages, setTournamentInfoImages] = useState<TournamentInfoImage[]>([]);
  const [tournamentInfoImagePreview, setTournamentInfoImagePreview] = useState('');
  const [savingTournamentSettings, setSavingTournamentSettings] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>(['', '', '']);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
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
  const [manualChampionTeamId, setManualChampionTeamId] = useState('');
  const [editingPredictionId, setEditingPredictionId] = useState<string | null>(null);
  const [editingPredictionValue, setEditingPredictionValue] = useState('');
  const [editingEventTitle, setEditingEventTitle] = useState(false);
  const [eventTitleDraft, setEventTitleDraft] = useState('');
  const [editingEventDate, setEditingEventDate] = useState(false);
  const [sharingPredictionBoard, setSharingPredictionBoard] = useState(false);
  const adminPredictionBoardRef = useRef<HTMLDivElement | null>(null);
  const [eventDateDraft, setEventDateDraft] = useState('');

  async function load() {
    const [{ data: u }, { data: e }, { data: p }, { data: t }, { data: ts }, { data: tm }, { data: ti }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*,users(*)'),
      supabase.from('tournament_teams').select('*,team_members(*,users(*))').order('created_at'),
      supabase.from('tournament_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('tournament_matches').select('*,team1:tournament_teams!tournament_matches_team1_id_fkey(*),team2:tournament_teams!tournament_matches_team2_id_fkey(*),winner:tournament_teams!tournament_matches_winner_team_id_fkey(*)').order('round').order('match_order'),
       supabase.from('tournament_info_images').select('*').order('created_at'),
    ]);
    setUsers(u || []);
    setEvents(e || []);
    const nextActive = (e || []).find((event: Event) => event.status === 'active');
    setEventLink(nextActive?.event_link || '');
    setEventSubtitle(nextActive?.subtitle || '');
    setPreds((p as any) || []);
    setTeams((t as any) || []);
    setTournamentMatches((tm as TournamentMatch[]) || []);
    setTournamentInfoImages((ti as TournamentInfoImage[]) || []);
    const nextTournamentSettings = (ts as TournamentSettings | null);
    setTournamentSettings(nextTournamentSettings);
    setTournamentTitle(nextTournamentSettings?.title || 'GIẢI ĐẤU');
    setTournamentSubtitle(nextTournamentSettings?.subtitle || 'Chơi game bằng thực lực!');
    setTournamentInfoImagePreview(nextTournamentSettings?.info_image_url || '');
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: s } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => s.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('admin-tournament-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
  const remainingTournamentTeams = teams.filter((team) => team.status !== 'stopped');
  const tournamentOpen = teams.length > 1 && remainingTournamentTeams.length > 1;

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

  function resetMatchForm() {
    setMatchRound('quarterfinal');
    setMatchOrder('1');
    setMatchTeam1('');
    setMatchTeam2('');
    setMatchTime('');
    setEditingMatchId(null);
  }

  function startEditMatch(match: TournamentMatch) {
    setEditingMatchId(match.id);
    setMatchRound(match.round);
    setMatchOrder(String(match.match_order));
    setMatchTeam1(match.team1_id || '');
    setMatchTeam2(match.team2_id || '');
    setMatchTime(match.match_time ? new Date(match.match_time).toISOString().slice(0, 16) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveTournamentMatch(e: any) {
    e.preventDefault();
    const order = Number(matchOrder);
    if (!Number.isInteger(order) || order < 1) {
      alert('Thứ tự trận không hợp lệ.');
      return;
    }
    if (!matchTeam1 || !matchTeam2 || matchTeam1 === matchTeam2) {
      alert('Hãy chọn 2 đội khác nhau.');
      return;
    }

    const payload = {
      round: matchRound,
      match_order: order,
      team1_id: matchTeam1,
      team2_id: matchTeam2,
      winner_team_id: null,
      match_time: matchTime ? new Date(matchTime).toISOString() : null,
    };

    const { error } = editingMatchId
      ? await supabase.from('tournament_matches').update(payload).eq('id', editingMatchId)
      : await supabase.from('tournament_matches').upsert(payload, { onConflict: 'round,match_order' });

    if (error) {
      alert('Không thể lưu trận đấu: ' + error.message);
      return;
    }

    resetMatchForm();
    load();
  }

  async function deleteTournamentMatch(match: TournamentMatch) {
    if (!confirm('Xóa trận đấu này khỏi sơ đồ?')) return;
    const { error } = await supabase.from('tournament_matches').delete().eq('id', match.id);
    if (error) {
      alert('Không thể xóa trận đấu: ' + error.message);
      return;
    }
    if (editingMatchId === match.id) resetMatchForm();
    load();
  }

  async function saveTournamentSettings(e: any) {
    e.preventDefault();

    const nextTitle = tournamentTitle.trim();
    const nextSubtitle = tournamentSubtitle.trim();

    if (!nextTitle || !nextSubtitle) {
      alert('Title và subtitle không được để trống.');
      return;
    }

    setSavingTournamentSettings(true);
    const hasNewImage = !!tournamentInfoImageFile;

    const { data: settingsData, error: settingsError } = await supabase
      .from('tournament_settings')
      .upsert({
        id: 1,
        title: nextTitle,
        subtitle: nextSubtitle,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (settingsError) {
      alert('Không thể lưu cấu hình giải đấu: ' + settingsError.message);
      setSavingTournamentSettings(false);
      return;
    }

    if (tournamentInfoImageFile) {
      if (!tournamentInfoImageFile.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh.');
        setSavingTournamentSettings(false);
        return;
      }

      if (tournamentInfoImageFile.size > 8 * 1024 * 1024) {
        alert('Ảnh tối đa 8MB.');
        setSavingTournamentSettings(false);
        return;
      }

      const extension = tournamentInfoImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const nextPath = 'tournament-info/' + Date.now() + '-' + crypto.randomUUID() + '.' + extension;
      const { error: uploadError } = await supabase.storage
        .from('tournament-assets')
        .upload(nextPath, tournamentInfoImageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: tournamentInfoImageFile.type,
        });

      if (uploadError) {
        alert('Không thể upload ảnh: ' + uploadError.message);
        setSavingTournamentSettings(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('tournament-assets')
        .getPublicUrl(nextPath);

      const { error: imageInsertError } = await supabase
        .from('tournament_info_images')
        .insert({
          image_url: publicUrlData.publicUrl,
          image_path: nextPath,
        });

      if (imageInsertError) {
        await supabase.storage.from('tournament-assets').remove([nextPath]);
        alert('Không thể lưu ảnh: ' + imageInsertError.message);
        setSavingTournamentSettings(false);
        return;
      }

      setTournamentInfoImageFile(null);
      setTournamentInfoImagePreview('');
    }

    setTournamentSettings(settingsData as TournamentSettings);
    setTournamentTitle(nextTitle);
    setTournamentSubtitle(nextSubtitle);
    setSavingTournamentSettings(false);
    await load();
    alert(hasNewImage ? 'Đã lưu thông tin và thêm hình ảnh.' : 'Đã lưu thông tin giải đấu.');
  }

  async function deleteTournamentInfoImageById(image: TournamentInfoImage) {
    if (!confirm('Xóa hình ảnh này khỏi danh sách?')) return;

    const { error: storageError } = await supabase.storage
      .from('tournament-assets')
      .remove([image.image_path]);

    if (storageError) {
      alert('Không thể xóa file ảnh: ' + storageError.message);
      return;
    }

    const { error } = await supabase
      .from('tournament_info_images')
      .delete()
      .eq('id', image.id);

    if (error) {
      alert('Không thể xóa ảnh: ' + error.message);
      return;
    }

    setTournamentInfoImages((current) => current.filter((item) => item.id !== image.id));
  }

  function resetTeamForm() {
    setTeamName('');
    setTeamMembers(['', '', '']);
    setEditingTeamId(null);
  }

  function startEditTeam(team: TournamentTeam) {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    const ids = (team.team_members || []).map((member) => member.user_id);
    setTeamMembers([ids[0] || '', ids[1] || '', ids[2] || '']);
  }

  function updateTeamMember(index: number, userId: string) {
    setTeamMembers((current) => current.map((value, i) => i === index ? userId : value));
  }

  function getAvailableTeamMembers(index: number) {
    const selectedInOtherTeams = new Set(
      teams
        .filter((team) => team.id !== editingTeamId)
        .flatMap((team) => (team.team_members || []).map((member) => member.user_id))
    );

    const selectedInOtherSlots = new Set(
      teamMembers.filter((userId, slotIndex) => slotIndex !== index && userId)
    );

    return users.filter((user) =>
      (!selectedInOtherTeams.has(user.id) || teamMembers[index] === user.id) &&
      (!selectedInOtherSlots.has(user.id) || teamMembers[index] === user.id)
    );
  }

  async function saveTeam(e: any) {
    e.preventDefault();
    const selected = teamMembers.filter(Boolean);
    if (!teamName.trim()) {
      alert('Tên đội không được để trống.');
      return;
    }
    if (selected.length !== 3 || new Set(selected).size !== 3) {
      alert('Mỗi đội phải có đúng 3 thành viên khác nhau.');
      return;
    }

    if (editingTeamId) {
      const { error: teamError } = await supabase
        .from('tournament_teams')
        .update({ name: teamName.trim() })
        .eq('id', editingTeamId);

      if (teamError) {
        alert('Không thể cập nhật đội: ' + teamError.message);
        return;
      }

      const { error: memberDeleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', editingTeamId);

      if (memberDeleteError) {
        alert('Không thể cập nhật thành viên đội: ' + memberDeleteError.message);
        return;
      }

      const { error: memberInsertError } = await supabase
        .from('team_members')
        .insert(selected.map((userId) => ({ team_id: editingTeamId, user_id: userId })));

      if (memberInsertError) {
        alert('Không thể cập nhật thành viên đội: ' + memberInsertError.message);
        return;
      }
    } else {
      const { data: created, error: teamError } = await supabase
        .from('tournament_teams')
        .insert({ name: teamName.trim(), status: 'active' })
        .select('id')
        .single();

      if (teamError || !created) {
        alert('Không thể tạo đội: ' + (teamError?.message || 'Không có dữ liệu đội.'));
        return;
      }

      const { error: memberInsertError } = await supabase
        .from('team_members')
        .insert(selected.map((userId) => ({ team_id: created.id, user_id: userId })));

      if (memberInsertError) {
        await supabase.from('tournament_teams').delete().eq('id', created.id);
        alert('Không thể thêm thành viên đội: ' + memberInsertError.message);
        return;
      }
    }

    resetTeamForm();
    load();
  }

  async function deleteTeam(team: TournamentTeam) {
    if (!confirm('Xóa đội "' + team.name + '"?')) return;
    const { error } = await supabase.from('tournament_teams').delete().eq('id', team.id);
    if (error) {
      alert('Không thể xóa đội: ' + error.message);
      return;
    }
    if (editingTeamId === team.id) resetTeamForm();
    load();
  }

  async function setTeamStatus(team: TournamentTeam, status: 'advanced' | 'stopped') {
    const label = status === 'advanced' ? 'Đi Tiếp' : 'Dừng bước';
    if (!confirm('Đánh dấu đội "' + team.name + '" là "' + label + '"?')) return;
    const { error } = await supabase.from('tournament_teams').update({ status }).eq('id', team.id);
    if (error) { alert('Không thể cập nhật trạng thái đội: ' + error.message); return; }

    const roundRank: Record<TournamentMatch['round'], number> = {
      round_of_16: 1,
      quarterfinal: 2,
      semifinal: 3,
      final: 4,
    };

    // A team can appear in previous rounds and the current round.
    // Always use the latest round containing this team.
    const match = [...tournamentMatches]
      .filter((item) => item.team1_id === team.id || item.team2_id === team.id)
      .sort((a, b) => roundRank[b.round] - roundRank[a.round] || b.match_order - a.match_order)[0];
    if (match) {
      const winnerTeamId = status === 'advanced'
        ? team.id
        : match.team1_id === team.id ? match.team2_id : match.team1_id;

      const { error: matchError } = await supabase.from('tournament_matches')
        .update({ winner_team_id: winnerTeamId }).eq('id', match.id);
      if (matchError) { alert('Không thể cập nhật đội thắng trong sơ đồ: ' + matchError.message); await load(); return; }

      const nextRoundMap: Record<TournamentMatch['round'], TournamentMatch['round'] | null> = {
        round_of_16: 'quarterfinal', quarterfinal: 'semifinal', semifinal: 'final', final: null,
      };
      const nextRound = nextRoundMap[match.round];
      if (nextRound && winnerTeamId) {
        const nextOrder = Math.ceil(match.match_order / 2);
        const nextSlotIsTeam1 = match.match_order % 2 === 1;
        const nextMatch = tournamentMatches.find((item) => item.round === nextRound && item.match_order === nextOrder);
        if (nextMatch) {
          await supabase.from('tournament_matches')
            .update({ [nextSlotIsTeam1 ? 'team1_id' : 'team2_id']: winnerTeamId })
            .eq('id', nextMatch.id);
        }
      }
    }
    await load();
  }

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

  async function deleteUser(user: User) {
    if (!confirm(`Xóa thành viên "${user.name}"? Các dự đoán của thành viên này cũng sẽ bị xóa.`)) {
      return;
    }

    const { error } = await supabase.from('users').delete().eq('id', user.id);

    if (error) {
      alert('Không thể xóa thành viên: ' + error.message);
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

    if (tournamentOpen && manualChampionTeamId) {
      const { error: championError } = await supabase
        .from('tournament_predictions')
        .upsert(
          {
            user_id: manualPredictionUserId,
            team_id: manualChampionTeamId,
          },
          { onConflict: 'user_id' }
        );

      if (championError) {
        await supabase.from('predictions').delete().eq('event_id', active.id).eq('user_id', manualPredictionUserId);
        alert('Không thể lưu đội vô địch: ' + championError.message);
        return;
      }
    } else {
      // No champion team selected: remove any old champion choice so it is
      // not displayed beside this user's prediction.
      const { error: clearChampionError } = await supabase
        .from('tournament_predictions')
        .delete()
        .eq('user_id', manualPredictionUserId);

      if (clearChampionError) {
        alert('Không thể xóa lựa chọn đội vô địch cũ: ' + clearChampionError.message);
        return;
      }
    }

    setManualPredictionUserId('');
    setManualPredictionNumber('');
    setManualChampionTeamId('');
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
              <button
                className="btn danger compact"
                type="button"
                onClick={() => {
                  const user = users.find((u) => u.id === editingUserId);
                  if (user) deleteUser(user);
                }}
              >
                Xóa thành viên
              </button>
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
        <button className={'tab ' + (tab === 'teams' ? 'active' : '')} onClick={() => setTab('teams')}>
          Giải đấu
        </button>
        <button className={'tab ' + (tab === 'users' ? 'active' : '')} onClick={() => setTab('users')}>
          User
        </button>
        <button className={'tab ' + (tab === 'history' ? 'active' : '')} onClick={() => setTab('history')}>
          Kết quả / Lịch sử
        </button>
      </nav>

      {tab === 'teams' && (
        <section className="panel tournament-admin-panel">
          <div className="tournament-admin-heading">
            <div>
              <h2 className="section-title">Đội thi đấu</h2>
              <p className="muted">Mỗi đội gồm đúng 3 thành viên. Admin có thể tạo, sửa, xóa và cập nhật tiến trình.</p>
            </div>
            <div className="admin-user-count">Tổng: {teams.length} đội</div>
          </div>

          <form className="tournament-settings-form" onSubmit={saveTournamentSettings}>
            <div className="tournament-form-title">Thông tin giải đấu</div>
            <div className="tournament-settings-fields">
              <div>
                <label className="tournament-settings-label">Title banner</label>
                <input
                  className="input"
                  value={tournamentTitle}
                  onChange={(e) => setTournamentTitle(e.target.value)}
                  placeholder="GIẢI ĐẤU"
                  required
                />
              </div>
              <div>
                <label className="tournament-settings-label">Subtitle banner</label>
                <input
                  className="input"
                  value={tournamentSubtitle}
                  onChange={(e) => setTournamentSubtitle(e.target.value)}
                  placeholder="Chơi game bằng thực lực!"
                  required
                />
              </div>
            </div>

            <div className="tournament-settings-image">
              <label className="tournament-settings-label">Hình ảnh thông tin giải đấu</label>
              {tournamentInfoImages.length > 0 ? (
                <div className="tournament-settings-image-grid">
                  {tournamentInfoImages.map((image, index) => (
                    <div className="tournament-settings-image-card" key={image.id}>
                      <img src={image.image_url} alt={'Thông tin giải đấu ' + (index + 1)} />
                      <div className="tournament-settings-image-card-actions">
                        <span>Ảnh {index + 1}</span>
                        <button className="btn danger compact" type="button" onClick={() => deleteTournamentInfoImageById(image)}>
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tournament-settings-image-empty">Chưa có hình ảnh thông tin giải đấu.</div>
              )}
              {tournamentInfoImagePreview && (
                <div className="tournament-settings-image-preview pending">
                  <img src={tournamentInfoImagePreview} alt="Ảnh chuẩn bị upload" />
                  <span>Ảnh mới sẽ được thêm vào danh sách, không thay thế ảnh cũ.</span>
                </div>
              )}
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setTournamentInfoImageFile(file);
                  if (file) setTournamentInfoImagePreview(URL.createObjectURL(file));
                }}
              />
              <div className="tournament-settings-actions">
                <button className="btn" type="submit" disabled={savingTournamentSettings}>
                  {savingTournamentSettings ? 'Đang lưu...' : 'Lưu thông tin giải đấu'}
                </button>
              </div>
            </div>
          </form>

          <form className="tournament-team-form" onSubmit={saveTeam}>
            <div className="tournament-form-title">{editingTeamId ? 'Sửa đội' : 'Tạo đội mới'}</div>
            <input className="input" required placeholder="Tên đội" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <div className="tournament-member-selects">
              {[0, 1, 2].map((index) => (
                <select
                  className="input"
                  required
                  key={index}
                  value={teamMembers[index]}
                  onChange={(e) => updateTeamMember(index, e.target.value)}
                >
                  <option value="">Chọn thành viên {index + 1}</option>
                  {getAvailableTeamMembers(index).map((u) => (
                    <option value={u.id} key={u.id}>{u.name}{u.nickname ? ' (' + u.nickname + ')' : ''}</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="tournament-form-actions">
              <button className="btn" type="submit">{editingTeamId ? 'Lưu đội' : 'Tạo đội'}</button>
              {editingTeamId && <button className="btn ghost" type="button" onClick={resetTeamForm}>Hủy</button>}
            </div>
          </form>

          <div className="tournament-bracket-admin">
            <div className="tournament-form-title">Sơ đồ trận đấu</div>
            <p className="muted">Sau khi tạo đội, chọn vòng đấu và ghép 2 đội vào từng trận. Thứ tự trận bắt đầu từ 1 trong mỗi vòng.</p>
            <form className="tournament-match-form" onSubmit={saveTournamentMatch}>
              <select className="input" value={matchRound} onChange={(e) => setMatchRound(e.target.value as TournamentMatch['round'])}>
                <option value="round_of_16">Vòng 1/8</option>
                <option value="quarterfinal">Tứ kết</option>
                <option value="semifinal">Bán kết</option>
                <option value="final">Chung kết</option>
              </select>
              <input className="input" type="number" min="1" placeholder="Trận số" value={matchOrder} onChange={(e) => setMatchOrder(e.target.value)} />
              <select className="input" value={matchTeam1} onChange={(e) => setMatchTeam1(e.target.value)} required>
                <option value="">Đội 1</option>
                {teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
              </select>
              <select className="input" value={matchTeam2} onChange={(e) => setMatchTeam2(e.target.value)} required>
                <option value="">Đội 2</option>
                {teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
              </select>
              <input className="input" type="datetime-local" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} />
              <div className="tournament-form-actions">
                <button className="btn" type="submit">{editingMatchId ? 'Lưu trận' : 'Thêm trận'}</button>
                {editingMatchId && <button className="btn ghost" type="button" onClick={resetMatchForm}>Hủy</button>}
              </div>
            </form>

            <div className="tournament-match-admin-list">
              {[...tournamentMatches].sort((a, b) => {
                const order: Record<TournamentMatch['round'], number> = { round_of_16: 1, quarterfinal: 2, semifinal: 3, final: 4 };
                return order[a.round] - order[b.round] || a.match_order - b.match_order;
              }).map((match) => (
                <div className="tournament-match-admin-row" key={match.id}>
                  <div>
                    <b>{match.round === 'round_of_16' ? 'Vòng 1/8' : match.round === 'quarterfinal' ? 'Tứ kết' : match.round === 'semifinal' ? 'Bán kết' : 'Chung kết'} · Trận {match.match_order}</b>
                    <span>{match.team1?.name || 'Đội 1'} vs {match.team2?.name || 'Đội 2'}{match.winner?.name ? ' · Đi tiếp: ' + match.winner.name : ''}</span>
                  </div>
                  <div className="tournament-admin-card-actions">
                    <button className="btn ghost compact" type="button" onClick={() => startEditMatch(match)}>Sửa</button>
                    <button className="btn danger compact" type="button" onClick={() => deleteTournamentMatch(match)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tournament-admin-list">
            {teams.map((team) => (
              <article className={'tournament-team-admin-card ' + (team.status === 'stopped' ? 'is-stopped' : '')} key={team.id}>
                <div className="tournament-team-admin-head">
                  <div>
                    <div className="tournament-team-status">{team.status === 'stopped' ? 'DỪNG BƯỚC' : team.status === 'advanced' ? 'ĐI TIẾP' : 'ĐANG THI ĐẤU'}</div>
                    <h3>{team.name}</h3>
                  </div>
                  <div className="tournament-admin-card-actions">
                    <button className="btn ghost compact" type="button" onClick={() => startEditTeam(team)}>Sửa</button>
                    <button className="btn danger compact" type="button" onClick={() => deleteTeam(team)}>Xóa</button>
                  </div>
                </div>
                <div className="tournament-team-admin-members">
                  {(team.team_members || []).map((member) => (
                    <div className="tournament-team-member" key={member.id}>
                      <img src={member.users?.avatar_url || '/avatar.svg'} alt={member.users?.name || 'Avatar'} />
                      <span>{member.users?.name || 'Thành viên'}</span>
                    </div>
                  ))}
                </div>
                <div className="tournament-team-status-actions">
                  <button className="btn tournament-advance-btn" type="button" onClick={() => setTeamStatus(team, 'advanced')}>Đi Tiếp</button>
                  <button className="btn danger tournament-stop-btn" type="button" onClick={() => setTeamStatus(team, 'stopped')}>Dừng bước</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
                <div className={"admin-manual-controls " + (tournamentOpen ? "has-champion" : "")}>
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
                  {tournamentOpen && (
                    <select
                      className="input admin-manual-champion"
                      value={manualChampionTeamId}
                      onChange={(e) => setManualChampionTeamId(e.target.value)}
                    >
                      <option value="">Không chọn đội vô địch</option>
                      {remainingTournamentTeams.map((team) => (
                        <option value={team.id} key={team.id}>{team.name}</option>
                      ))}
                    </select>
                  )}
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

              <div className="admin-prediction-share-capture" ref={adminPredictionBoardRef}>
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
              </div>

              <button
                className="prediction-share-image-btn admin-prediction-share-btn"
                type="button"
                disabled={sharingPredictionBoard || activePreds.length === 0}
                onClick={async () => {
                  if (!adminPredictionBoardRef.current || activePreds.length === 0 || sharingPredictionBoard) return;
                  setSharingPredictionBoard(true);
                  try {
                    const { default: html2canvas } = await import('html2canvas');
                    const canvas = await html2canvas(adminPredictionBoardRef.current, {
                      backgroundColor: '#061a2b',
                      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
                      useCORS: true,
                      allowTaint: false,
                      logging: false,
                    });
                    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'fam-times-admin-bang-du-doan.png', 'image/png'));
                    if (!blob) throw new Error('Không thể tạo ảnh.');
                    const file = new File([blob], 'fam-times-admin-bang-du-doan.png', { type: 'image/png' });

                    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
                      await navigator.share({
                        title: 'FAM - TIMES · Bảng dự đoán',
                        text: active?.title ? 'Bảng dự đoán · ' + active.title : 'Bảng dự đoán FAM - TIMES',
                        files: [file],
                      });
                    } else {
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                    }
                  } catch (error: any) {
                    if (error?.name !== 'AbortError') {
                      alert('Không thể tạo ảnh chia sẻ. Vui lòng thử lại.');
                    }
                  } finally {
                    setSharingPredictionBoard(false);
                  }
                }}
              >
                <span aria-hidden="true">↗</span>
                {sharingPredictionBoard ? 'Đang tạo ảnh...' : 'Chia sẻ hình ảnh'}
              </button>

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
          <h2 className="section-title admin-user-list-title">
            <span>Danh sách người tham gia</span>
            <span className="admin-user-count">Tổng: {users.length} thành viên</span>
          </h2>
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
          <div className="history-table-wrap">
            <table className="table history-table">
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
          </div>
        </section>
      )}
      </main>
    </>
  );
}
