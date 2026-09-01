export type CommunicationsReadinessInput={webhookConfigured:boolean;activeChannels:number;interpretedChannels:number;criticalPending:number;messages:number;messages24h:number;pendingInsights:number}
export type CommunicationsReadinessWarning={id:'whatsapp-config'|'whatsapp-no-active-channels'|'whatsapp-no-interpreted-channels'|'whatsapp-no-messages';title:string;detail:string}
export type CommunicationsReadinessResult={status:'healthy'|'degraded';detail:string;warning:CommunicationsReadinessWarning|null}

export function assessCommunicationsReadiness(input:CommunicationsReadinessInput):CommunicationsReadinessResult{
 if(!input.webhookConfigured)return{status:'degraded',detail:'El webhook no tiene secreto configurado.',warning:{id:'whatsapp-config',title:'Webhook WhatsApp no configurado',detail:'La estructura existe, pero no se puede aceptar ingesta sin WHATSAPP_WEBHOOK_SECRET.'}}
 if(input.activeChannels===0)return{status:'degraded',detail:'El webhook está configurado, pero no hay canales WhatsApp activos.',warning:{id:'whatsapp-no-active-channels',title:'WhatsApp sin canales activos',detail:'El webhook puede recibir tráfico, pero no existe ningún canal activo habilitado para la operación.'}}
 if(input.interpretedChannels===0)return{status:'degraded',detail:`${input.activeChannels} canal(es) activo(s), pero ninguno está habilitado para interpretación.`,warning:{id:'whatsapp-no-interpreted-channels',title:'WhatsApp sin canales interpretados',detail:'Hay canales activos, pero WhatsApp Intelligence no puede generar señales hasta habilitar al menos un canal para interpretación.'}}
 if(input.criticalPending>0)return{status:'degraded',detail:`${input.criticalPending} insight(s) críticos esperan revisión.`,warning:null}
 if(input.messages===0)return{status:'degraded',detail:'Canales activos e interpretados, pero todavía no hay mensajes raw ingeridos.',warning:{id:'whatsapp-no-messages',title:'WhatsApp sin ingesta observada',detail:'Hay canales operativos configurados, pero no existe evidencia raw recibida todavía.'}}
 return{status:'healthy',detail:`${input.messages24h} mensaje(s) ingeridos en 24 h; ${input.pendingInsights} insight(s) pendientes.`,warning:null}
}
