-- Tribeca Aula v195 · Izam Sánchez · sustituir material 1.3 por juego completo.
-- Ejecutar una vez en Supabase > SQL Editor.
-- Requiere subir a GitHub la carpeta assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/

-- 1) Asegurar columnas necesarias para material embebido/presentación.
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

-- 2) Permitir presentaciones/juegos si existía una restricción antigua.
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
  add constraint subject_materials_material_type_v195_check
  check (
    material_type is null or material_type in (
      'apuntes','material','recurso','documento','document','link',
      'presentacion','presentation','video','esquema','test','simulacro','juego','tarea','actividad'
    )
  );

-- 3) Localizar el aula privada de Izam, su materia y la unidad 1.
do $$
declare
  v_teacher_id uuid;
  v_izam_id uuid;
  v_class_id uuid;
  v_subject_id uuid;
  v_unit_id uuid;
  v_material_id uuid;
  v_game_url text := 'assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/index.html';
  v_title text := '🎮 1.3. Gimnasio 1: Pueblo Palabra';
  v_body text := 'Juego actualizado de la Unidad 1 de Técnicas de estudio. Incluye audio, assets, pantallas interactivas, combate educativo y dinámica aleatoria de retos. Para jugar correctamente, abre el material y permite el sonido cuando el navegador lo solicite.';
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

  -- Buscar el material 1.3 existente para sustituirlo, sin crear duplicados.
  select id into v_material_id
  from public.subject_materials
  where class_id = v_class_id
    and class_subject_id = v_subject_id
    and class_unit_id = v_unit_id
    and active is not false
    and coalesce(hidden,false) is false
    and (
      trim(coalesce(display_order,'')) = '1.3'
      or lower(coalesce(title,'')) like '1.3%'
      or lower(coalesce(title,'')) like '% 1.3%'
      or lower(coalesce(title,'')) like '%material%1.3%'
    )
  order by
    case when trim(coalesce(display_order,'')) = '1.3' then 0 else 1 end,
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
      v_game_url, null, 780,
      v_class_id, v_subject_id, v_unit_id,
      jsonb_build_array(jsonb_build_object('name','Gimnasio 1 · Pueblo Palabra','url',v_game_url,'type','text/html')),
      ARRAY[]::text[], true,
      '1.3', 1.3,
      'Creado por v195: juego actualizado de Izam con audio, assets y aleatorización.', now(), now()
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
           link_url = v_game_url,
           material_type = 'presentacion',
           embed_url = v_game_url,
           embed_code = null,
           embed_height = 780,
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
           notes = trim(both ' ' from coalesce(m.notes,'') || ' | v195: actualizado por juego v21.5 random de Izam.'),
           updated_at = now()
      from public.tribeca_classes c,
           public.tribeca_class_subjects s,
           public.tribeca_class_units u
     where m.id = v_material_id
       and c.id = v_class_id
       and s.id = v_subject_id
       and u.id = v_unit_id;
  end if;

  raise notice 'Material 1.3 de Izam actualizado. id=%, url=%', v_material_id, v_game_url;
end $$;

-- 4) Comprobación final.
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
  m.active,
  m.hidden
from public.subject_materials m
left join public.tribeca_classes c on c.id = m.class_id
left join public.tribeca_class_subjects s on s.id = m.class_subject_id
left join public.tribeca_class_units u on u.id = m.class_unit_id
where lower(coalesce(c.name,'') || ' ' || coalesce(c.course,'') || ' ' || coalesce(c.description,'')) like '%izam%'
   or lower(coalesce(m.title,'')) like '%gimnasio 1%pueblo palabra%'
order by m.updated_at desc nulls last, m.created_at desc nulls last
limit 20;
