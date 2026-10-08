export type User={id:string;name:string;nickname:string|null;avatar_url:string|null;pin_code?:string|null;created_at:string};
export type Event={id:string;title:string;event_date:string|null;actual_result:number|null;status:'active'|'closed';event_link:string|null;subtitle:string|null;created_at:string};
export type Prediction={id:string;event_id:string;user_id:string;prediction:number;users?:User};

export type TournamentTeamMember={id:string;team_id:string;user_id:string;users?:User};
export type TournamentTeam={id:string;name:string;status:'active'|'advanced'|'stopped';created_at:string;team_members?:TournamentTeamMember[]};

export type TournamentSettings={id:number;title:string;subtitle:string;info_image_url:string|null;info_image_path:string|null;updated_at:string};

export type TournamentPrediction={id:string;user_id:string;team_id:string;created_at:string;users?:User;team?:TournamentTeam};

export type TournamentMatch={id:string;round:'round_of_16'|'quarterfinal'|'semifinal'|'final';match_order:number;team1_id:string|null;team2_id:string|null;winner_team_id:string|null;score1:number|null;score2:number|null;match_time:string|null;created_at:string;team1?:TournamentTeam;team2?:TournamentTeam;winner?:TournamentTeam};

export type TournamentInfoImage={id:string;image_url:string;image_path:string;created_at:string};
