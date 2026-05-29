create table if not exists public.preview_layouts (
  id text primary key,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  layout jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preview_layouts enable row level security;

drop policy if exists "Published preview layouts are readable" on public.preview_layouts;

create policy "Published preview layouts are readable"
on public.preview_layouts
for select
to anon, authenticated
using (is_published = true);

create or replace function public.set_preview_layouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists preview_layouts_set_updated_at on public.preview_layouts;

create trigger preview_layouts_set_updated_at
before update on public.preview_layouts
for each row
execute function public.set_preview_layouts_updated_at();

insert into public.preview_layouts (id, sort_order, is_published, layout)
values
  (
    'hero',
    10,
    true,
    '{"id":"hero","name":"Hero","layout":"hero","previewHeight":190,"metricLimit":4,"x":16,"y":435,"width":288,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'vertical',
    20,
    true,
    '{"id":"vertical","name":"Vertical","layout":"vertical","premium":false,"previewHeight":244,"metricLimit":4,"x":70,"y":336,"width":300,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'compact',
    30,
    true,
    '{"id":"compact","name":"Compact","layout":"compact","premium":false,"previewHeight":132,"metricLimit":4,"x":20,"y":480,"width":280,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'columns',
    40,
    true,
    '{"id":"columns","name":"Columns","layout":"columns","premium":false,"previewHeight":146,"metricLimit":4,"x":12,"y":490,"width":350,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'grid-2x2',
    50,
    true,
    '{"id":"grid-2x2","name":"Grid 2x2","layout":"grid-2x2","premium":false,"previewHeight":186,"metricLimit":4,"x":18,"y":420,"width":284,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'mile-ring',
    60,
    true,
    '{"id":"mile-ring","name":"Mile Ring","layout":"mile-ring","premium":true,"previewHeight":246,"metricLimit":5,"defaultVisibleFields":{"distance":true,"time":true,"pace":true,"elev":true,"cadence":false,"calories":true,"avgHr":false},"resetTransformsOnSelect":true,"x":20,"y":132,"width":320,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'signal-board',
    70,
    true,
    '{"id":"signal-board","name":"Signal Board","layout":"signal-board","premium":false,"previewHeight":214,"metricLimit":5,"defaultVisibleFields":{"distance":true,"time":true,"pace":true,"elev":true,"cadence":false,"calories":false,"avgHr":true},"resetTransformsOnSelect":true,"x":18,"y":210,"width":324,"backgroundColor":"rgba(10,14,24,0.24)","borderColor":"rgba(255,255,255,0.16)","borderWidth":1,"radius":28}'::jsonb
  ),
  (
    'social-pill',
    80,
    true,
    '{"id":"social-pill","name":"Social Pill","layout":"social-pill","premium":false,"previewHeight":122,"metricLimit":3,"resetTransformsOnSelect":true,"defaultVisibleFields":{"distance":true,"time":true,"pace":true,"elev":false,"cadence":false,"calories":false,"avgHr":false},"x":32,"y":356,"width":280,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'glass-row',
    90,
    true,
    '{"id":"glass-row","name":"Glass Row","layout":"glass-row","premium":false,"previewHeight":190,"metricLimit":4,"x":16,"y":420,"width":328,"backgroundColor":"rgba(12,18,28,0.42)","borderColor":"transparent","borderWidth":1,"radius":22}'::jsonb
  ),
  (
    'soft-stack',
    100,
    true,
    '{"id":"soft-stack","name":"Soft Stack","layout":"soft-stack","previewHeight":244,"metricLimit":4,"x":36,"y":300,"width":288,"backgroundColor":"rgba(6,8,14,0.56)","borderColor":"transparent","borderWidth":1,"radius":18}'::jsonb
  ),
  (
    'pill-inline',
    110,
    true,
    '{"id":"pill-inline","name":"Pill Inline","layout":"pill-inline","premium":false,"previewHeight":132,"metricLimit":4,"x":24,"y":496,"width":312,"backgroundColor":"rgba(8,12,20,0.62)","borderColor":"transparent","borderWidth":1,"radius":999}'::jsonb
  ),
  (
    'card-columns',
    120,
    true,
    '{"id":"card-columns","name":"Card Columns","layout":"card-columns","premium":false,"previewHeight":146,"metricLimit":4,"x":14,"y":468,"width":332,"backgroundColor":"rgba(10,14,24,0.65)","borderColor":"transparent","borderWidth":1,"radius":16}'::jsonb
  ),
  (
    'panel-grid',
    130,
    true,
    '{"id":"panel-grid","name":"Panel Grid","layout":"panel-grid","premium":false,"previewHeight":186,"metricLimit":4,"x":24,"y":402,"width":312,"backgroundColor":"rgba(10,15,24,0.62)","borderColor":"transparent","borderWidth":1,"radius":20}'::jsonb
  ),
  (
    'sunset-hero',
    140,
    true,
    '{"id":"sunset-hero","name":"Sunset Hero","layout":"sunset-hero","premium":true,"previewHeight":190,"metricLimit":5,"supportsPrimaryLayer":true,"resetTransformsOnSelect":true,"defaultVisibleFields":{"distance":true,"time":true,"pace":true,"elev":true,"cadence":false,"calories":false,"avgHr":true},"x":20,"y":220,"width":320,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'morning-glass',
    150,
    true,
    '{"id":"morning-glass","name":"Morning Glass","layout":"morning-glass","premium":true,"previewHeight":190,"metricLimit":6,"supportsPrimaryLayer":true,"resetTransformsOnSelect":true,"defaultVisibleFieldOrder":["distance","time","pace","elev","avgHr","calories","cadence"],"defaultVisibleFieldCount":6,"x":12,"y":286,"width":336,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  ),
  (
    'split-bold',
    160,
    true,
    '{"id":"split-bold","name":"Split Bold","layout":"split-bold","premium":true,"previewHeight":228,"metricLimit":6,"supportsPrimaryLayer":true,"resetTransformsOnSelect":true,"x":24,"y":210,"width":212,"backgroundColor":"transparent","borderColor":"transparent","borderWidth":0,"radius":0}'::jsonb
  )
on conflict (id) do update set
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  layout = excluded.layout;
