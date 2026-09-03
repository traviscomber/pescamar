import {expect,test} from '@playwright/test'
import {buildLotEvidence,parseLotDate,triageReviewRow} from '../api/_production-review-triage'

test('lot-code date evidence remains reference-only',()=>{
  expect(parseLotDate('mdq22140426')).toBe('2026-04-14')
  expect(parseLotDate('ig4107052025')).toBe('2025-05-07')
  expect(parseLotDate('x48210625')).toBe('2025-06-21')
  expect(parseLotDate('sin-fecha')).toBeNull()

  const clean={lot_code:'md01040425',reception_date:'2025-04-03',process_date:'2025-04-04',production_date:'2025-04-05',data_quality_flags:[]}
  const flagged={lot_code:'md08100425',reception_date:'2025-04-10',process_date:'2025-04-11',production_date:'2025-04-10',data_quality_flags:['production_before_process']}
  const evidence=buildLotEvidence([clean,flagged])
  expect(evidence).toMatchObject({parseableRows:2,processMatches:1,productionMatches:1,receptionMatches:1,flaggedWithLotDate:1,flaggedProcessConflicts:1})

  const processTriage=triageReviewRow({...flagged,context_rows:1})
  expect(processTriage).toMatchObject({focus:'process_date_review',lotDate:'2025-04-10',referenceOnly:true})
  expect(processTriage.lotDateMatches).toEqual(['reception','production'])

  const receptionTriage=triageReviewRow({lot_code:'mdq213100626',reception_date:'2026-10-09',process_date:'2026-06-10',production_date:'2026-06-12',data_quality_flags:['production_before_reception'],context_rows:1})
  expect(receptionTriage).toMatchObject({focus:'reception_date_review',lotDate:'2026-06-10',referenceOnly:true})
  expect(receptionTriage.lotDateMatches).toEqual(['process'])

  const contextTriage=triageReviewRow({lot_code:'fq152230526',reception_date:'2026-05-22',process_date:'2026-05-23',production_date:'2026-05-24',data_quality_flags:[],context_rows:2})
  expect(contextTriage).toMatchObject({focus:'context_review',lotDate:'2026-05-23',referenceOnly:true})
})
