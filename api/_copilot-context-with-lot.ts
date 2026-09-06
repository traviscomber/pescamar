import type {SessionOperator} from './_auth.js'
import {buildCopilotContext,type CopilotContext} from './_copilot-context.js'
import {buildLotControlCard} from './_lot-control-card.js'

export async function buildCopilotContextWithLot(operator:SessionOperator,plantId:string|null,receptionId:unknown):Promise<CopilotContext>{
 const [context,card]=await Promise.all([buildCopilotContext(operator,plantId),buildLotControlCard(operator,receptionId)])
 if(!card)return context
 const {source,...lotControl}=card
 return {...context,sources:[...context.sources,source],data:{...context.data,lot_control:lotControl}}
}
