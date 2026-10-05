export type User={id:string;name:string;nickname:string|null;avatar_url:string|null;pin_code?:string|null;created_at:string};
export type Event={id:string;title:string;event_date:string|null;actual_result:number|null;status:'active'|'closed';event_link:string|null;subtitle:string|null;created_at:string};
export type Prediction={id:string;event_id:string;user_id:string;prediction:number;users?:User};

export type TournamentTeamMember={id:string;team_id:string;user_id:string;users?:User};
export type TournamentTeam={id:string;name:string;status:'active'|'advanced'|'stopped';created_at:string;team_members?:TournamentTeamMember[]};

export type TournamentSettings={id:number;title:string;subtitle:string;info_image_url:string|null;info_image_path:string|null;updated_at:string};
