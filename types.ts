export type User={id:string;name:string;nickname:string|null;avatar_url:string|null;created_at:string};
export type Event={id:string;title:string;event_date:string|null;actual_result:number|null;status:'active'|'closed';created_at:string};
export type Prediction={id:string;event_id:string;user_id:string;prediction:number;users?:User};
