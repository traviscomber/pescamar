// CANONICAL READ-ONLY QUERIES of api/pilot-insights.ts (source of truth: the endpoint).
// Generated from api/pilot-insights.ts — do not edit by hand. The pilot-insights-sql-smoke
// executes these verbatim against an ephemeral Neon branch and asserts the endpoint source
// still contains each query, so drift in either direction fails CI before deploy.

export const QUERIES=[
 {name:"top_routes_7d_30d",sql:"select path,\n     count(*) filter (where created_at>=now()-interval '7 days')::int visits_7d,\n     count(distinct operator_id) filter (where created_at>=now()-interval '7 days')::int operators_7d,\n     count(*)::int visits_30d,\n     count(distinct operator_id)::int operators_30d\n    from pilot_events\n    where event='route_visited' and created_at>=now()-interval '30 days'\n    group by path\n    order by visits_30d desc,path asc\n    limit 12"},
 {name:"daily_active_operators_14d",sql:"select to_char(created_at::date,'YYYY-MM-DD') \"day\",count(distinct operator_id)::int operators\n    from pilot_events\n    where created_at>=now()-interval '14 days'\n    group by created_at::date\n    order by created_at::date asc"},
 {name:"latest_events_50",sql:"select e.created_at,e.operator_id,o.full_name operator_name,e.role,e.event,e.path\n    from pilot_events e left join operators o on o.id=e.operator_id\n    order by e.id desc\n    limit 50"},
 {name:"ml_feedback_totals",sql:"select count(*)::int total,\n     count(*) filter (where rating='good')::int up,\n     count(*) filter (where rating='bad')::int down\n    from ml_feedback"},
 {name:"ml_feedback_recent_downs",sql:"select f.created_at,o.full_name operator_name,left(f.comment,300) comment,left(f.question,220) question,left(f.answer,400) answer\n    from ml_feedback f left join operators o on o.id=f.operator_id\n    where f.rating='bad'\n    order by f.id desc\n    limit 10"}
]
