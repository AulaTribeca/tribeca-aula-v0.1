-- Tribeca Aula v196 · Izam · reparar visibilidad del juego 1.3.
-- Ejecutar una vez en Supabase > SQL Editor.
-- Esta versión fuerza el material 1.3 a cargar el juego desde URL absoluta para que funcione también en ventanas about:blank.

alter table if exists public.subject_materials
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists description text,
  add column if not exists content text,
  add column if not exists image_url text,
  add column if not exists link_url text,
  add column if not exists font_size integer,
  add column if not exists target_scope text,
  add column if not exists center text,
  add column if not exists stage text,
  add column if not exists course text,
  add column if not exists created_by uuid,
  add column if not exists hidden boolean default false,
  add column if not exists subject text,
  add column if not exists unit_title text,
  add column if not exists unit text,
  add column if not exists material_type text,
  add column if not exists embed_url text,
  add column if not exists embed_code text,
  add column if not exists embed_height integer,
  add column if not exists class_id uuid,
  add column if not exists class_subject_id uuid,
  add column if not exists class_unit_id uuid,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists badge_codes text[] not null default ARRAY[]::text[],
  add column if not exists active boolean default true,
  add column if not exists notes text,
  add column if not exists display_order text,
  add column if not exists sort_order numeric,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Relajar restricciones antiguas de material_type si las hubiera.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.subject_materials'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%material_type%'
  loop
    execute format('alter table public.subject_materials drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.subject_materials
  add constraint subject_materials_material_type_v196_check
  check (
    material_type is null or material_type in (
      'apuntes','material','recurso','documento','document','link',
      'presentacion','presentation','video','esquema','test','simulacro','juego','tarea','actividad'
    )
  );

do $$
declare
  v_teacher_id uuid;
  v_izam_id uuid;
  v_class_id uuid;
  v_subject_id uuid;
  v_unit_id uuid;
  v_material_id uuid;
  v_relative_url text := 'assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/index.html';
  v_game_url text := 'https://aulatribeca.github.io/tribeca-aula-v0.1/assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/index.html';
  v_title text := '🎮 1.3. Gimnasio 1: Pueblo Palabra';
  v_body text := 'Juego de la Unidad 1 de Técnicas de estudio. Incluye audio, assets y retos aleatorios para trabajar palabras clave. Para jugar correctamente, abre el material y permite el sonido cuando el navegador lo solicite.';
begin
  select id into v_teacher_id
  from public.profiles
  where role = 'teacher'
  order by created_at nulls last
  limit 1;

  select id into v_izam_id
  from public.profiles
  where role = 'student'
    and lower(coalesce(full_name,'') || ' ' || coalesce(username,'')) like '%izam%'
    and (
      lower(coalesce(full_name,'') || ' ' || coalesce(username,'')) like '%sanchez%'
      or lower(coalesce(full_name,'') || ' ' || coalesce(username,'')) like '%sánchez%'
      or lower(coalesce(full_name,'') || ' ' || coalesce(username,'')) like '%s%nchez%'
    )
  order by created_at nulls last
  limit 1;

  if v_izam_id is null then
    raise exception 'No se encontró el perfil de Izam Sánchez en public.profiles.';
  end if;

  select c.id into v_class_id
  from public.tribeca_class_students a
  join public.tribeca_classes c on c.id = a.class_id
  left join public.tribeca_class_subjects s on s.class_id = c.id
  where a.user_id = v_izam_id
    and a.active is not false
    and c.active is not false
    and coalesce(c.hidden,false) is false
    and (
      lower(coalesce(c.name,'') || ' ' || coalesce(c.course,'') || ' ' || coalesce(c.description,'')) like '%tecnica%estudio%'
      or lower(coalesce(c.name,'') || ' ' || coalesce(c.course,'') || ' ' || coalesce(c.description,'')) like '%técnica%estudio%'
      or lower(coalesce(s.subject,'')) like '%tecnica%estudio%'
      or lower(coalesce(s.subject,'')) like '%técnica%estudio%'
    )
  order by c.created_at nulls last
  limit 1;

  if v_class_id is null then
    raise exception 'No se encontró el aula activa de Técnicas de estudio de Izam.';
  end if;

  select id into v_subject_id
  from public.tribeca_class_subjects
  where class_id = v_class_id
    and active is not false
    and coalesce(hidden,false) is false
    and (
      lower(coalesce(subject,'')) like '%tecnica%estudio%'
      or lower(coalesce(subject,'')) like '%técnica%estudio%'
    )
  order by sort_order nulls last, created_at nulls last
  limit 1;

  if v_subject_id is null then
    insert into public.tribeca_class_subjects (class_id, subject, sort_order, hidden, active, created_at, updated_at)
    values (v_class_id, 'Técnicas de estudio', 1, false, true, now(), now())
    returning id into v_subject_id;
  end if;

  select id into v_unit_id
  from public.tribeca_class_units
  where class_subject_id = v_subject_id
    and active is not false
    and coalesce(hidden,false) is false
    and (
      sort_order = 1
      or lower(coalesce(title,'')) like '%unidad%1%'
      or lower(coalesce(title,'')) like '%palabras%clave%'
    )
  order by
    case when sort_order = 1 then 0 else 1 end,
    sort_order nulls last,
    created_at nulls last
  limit 1;

  if v_unit_id is null then
    insert into public.tribeca_class_units (class_subject_id, title, sort_order, hidden, active, created_at, updated_at)
    values (v_subject_id, 'Unidad 1. Palabras clave', 1, false, true, now(), now())
    returning id into v_unit_id;
  end if;

  -- Elegir el material 1.3 real de esa unidad, aunque se llame todavía "Reto final".
  select id into v_material_id
  from public.subject_materials
  where class_id = v_class_id
    and class_subject_id = v_subject_id
    and class_unit_id = v_unit_id
    and (
      trim(coalesce(display_order,'')) = '1.3'
      or lower(coalesce(title,'')) like '1.3%'
      or lower(coalesce(title,'')) like '% 1.3%'
      or lower(coalesce(title,'')) like '%reto final%'
      or lower(coalesce(title,'')) like '%gimnasio 1%'
      or lower(coalesce(embed_url,'')) like '%gimnasio-1-pueblo-palabra%'
      or lower(coalesce(link_url,'')) like '%gimnasio-1-pueblo-palabra%'
    )
  order by
    case when trim(coalesce(display_order,'')) = '1.3' then 0 else 1 end,
    case when lower(coalesce(title,'')) like '%reto final%' then 0 else 1 end,
    updated_at desc nulls last,
    created_at desc nulls last
  limit 1;

  if v_material_id is null then
    insert into public.subject_materials (
      title, body, description, content,
      image_url, link_url, font_size,
      target_scope,
      center, stage, course,
      created_by, hidden,
      subject, unit_title, unit, material_type,
      embed_url, embed_code, embed_height,
      class_id, class_subject_id, class_unit_id,
      attachments, badge_codes, active,
      display_order, sort_order,
      notes, created_at, updated_at
    )
    select
      v_title, v_body, v_body, v_body,
      null, v_game_url, 17,
      'class',
      c.center, c.stage, c.course,
      v_teacher_id, false,
      s.subject, u.title, u.title, 'presentacion',
      v_game_url, null, 900,
      v_class_id, v_subject_id, v_unit_id,
      jsonb_build_array(jsonb_build_object('name','Gimnasio 1 · Pueblo Palabra','url',v_game_url,'type','text/html')),
      ARRAY[]::text[], true,
      '1.3', 1.3,
      'Creado por v196: juego de Izam con URL absoluta para carga correcta.', now(), now()
    from public.tribeca_classes c
    join public.tribeca_class_subjects s on s.id = v_subject_id
    join public.tribeca_class_units u on u.id = v_unit_id
    where c.id = v_class_id
    returning id into v_material_id;
  else
    update public.subject_materials m
       set title = v_title,
           body = v_body,
           description = v_body,
           content = v_body,
           image_url = null,
           link_url = v_game_url,
           material_type = 'presentacion',
           embed_url = v_game_url,
           embed_code = null,
           embed_height = 900,
           class_id = v_class_id,
           class_subject_id = v_subject_id,
           class_unit_id = v_unit_id,
           subject = s.subject,
           unit_title = u.title,
           unit = u.title,
           target_scope = 'class',
           center = c.center,
           stage = c.stage,
           course = c.course,
           hidden = false,
           active = true,
           display_order = '1.3',
           sort_order = 1.3,
           attachments = jsonb_build_array(jsonb_build_object('name','Gimnasio 1 · Pueblo Palabra','url',v_game_url,'type','text/html')),
           notes = trim(both ' ' from coalesce(m.notes,'') || ' | v196: reparado juego 1.3 con URL absoluta y tipo presentación.'),
           updated_at = now()
      from public.tribeca_classes c,
           public.tribeca_class_subjects s,
           public.tribeca_class_units u
     where m.id = v_material_id
       and c.id = v_class_id
       and s.id = v_subject_id
       and u.id = v_unit_id;
  end if;

  -- Ocultar duplicados 1.3 dentro de la misma unidad para que Izam vea solo el juego correcto.
  update public.subject_materials
     set hidden = true,
         active = false,
         notes = trim(both ' ' from coalesce(notes,'') || ' | v196: ocultado como duplicado del material 1.3 de Izam.'),
         updated_at = now()
   where class_id = v_class_id
     and class_subject_id = v_subject_id
     and class_unit_id = v_unit_id
     and id <> v_material_id
     and (
       trim(coalesce(display_order,'')) = '1.3'
       or lower(coalesce(title,'')) like '1.3%'
       or lower(coalesce(title,'')) like '% 1.3%'
       or lower(coalesce(title,'')) like '%reto final%'
       or lower(coalesce(title,'')) like '%gimnasio 1%'
     );

  raise notice 'Material 1.3 reparado. id=%, url=%', v_material_id, v_game_url;
end $$;

select
  m.id,
  c.name as clase,
  s.subject as materia,
  u.title as unidad,
  m.display_order,
  m.sort_order,
  m.title,
  m.material_type,
  m.embed_url,
  m.embed_code is not null as tiene_embed_code,
  m.active,
  m.hidden
from public.subject_materials m
left join public.tribeca_classes c on c.id = m.class_id
left join public.tribeca_class_subjects s on s.id = m.class_subject_id
left join public.tribeca_class_units u on u.id = m.class_unit_id
where m.class_unit_id in (
  select u2.id
  from public.tribeca_class_units u2
  join public.tribeca_class_subjects s2 on s2.id = u2.class_subject_id
  join public.tribeca_classes c2 on c2.id = s2.class_id
  join public.tribeca_class_students a2 on a2.class_id = c2.id
  join public.profiles p2 on p2.id = a2.user_id
  where lower(coalesce(p2.full_name,'') || ' ' || coalesce(p2.username,'')) like '%izam%'
    and (lower(coalesce(s2.subject,'')) like '%tecnica%estudio%' or lower(coalesce(s2.subject,'')) like '%técnica%estudio%')
)
order by m.sort_order nulls last, m.display_order nulls last, m.created_at nulls last;
