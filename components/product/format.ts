export function updated(value:string|null|undefined){if(!value)return "";const date=new Date(value);return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);}
export function shortDate(value:string){return value.slice(0,10).replace(/^(\d{4})-(\d{2})-(\d{2})$/,"$2/$3");}
