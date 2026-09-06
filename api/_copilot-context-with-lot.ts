import type {SessionOperator} from './_auth.js'
import {buildCopilotContext,type CopilotContext} from './_copilot-context.js'
import {buildLotControlCard} from './_lot-control-card.js'
import {buildCopilotOperationalIntelligence} from './_copilot-operational-intelligence.js'

export async function buildCopilotContextWithLot(operator:SessionOperator,plantId:string|null,receptionId:unknown):Promise<CopilotContext>{
 const [context,card,operational]=await Promise.all([buildCopilotContext(operator,plantId),buildLotControlCard(operator,receptionId),buildCopilotOperationalIntelligence(operator,receptionId)])
 if(!card||plantId&&card.reception.plantId!==plantId)return context
 const {source,...lotControl}=card
 const operationalSource=operational?.source
 return {...context,sources:[...context.sources,source,...(operationalSource?[operationalSource]:[])],data:{...context.data,lot_control:lotControl,...(operational?{operational_intelligence:operational.data}:{})}}
}
