-- Tribeca Aula v204 · adjudicar a Izam la medalla llave / Palabras clave
-- Ejecutar en Supabase SQL Editor después de subir los archivos v204.

begin;

insert into public.user_badges (user_id, badge_code, badge_name, assigned_by)
select
  p.id as user_id,
  'pk_keywords' as badge_code,
  'Medalla Palabras clave' as badge_name,
  coalesce(
    (select t.id from public.profiles t where lower(coalesce(t.role,'')) = 'teacher' limit 1),
    p.id
  ) as assigned_by
from public.profiles p
where lower(coalesce(p.role,'')) = 'student'
  and lower(concat_ws(' ', p.full_name, p.username)) like '%izam%'
  and not exists (
    select 1
    from public.user_badges ub
    where ub.user_id = p.id
      and ub.badge_code = 'pk_keywords'
  );

commit;

select
  p.id,
  p.full_name,
  p.username,
  ub.badge_code,
  ub.badge_name,
  ub.created_at
from public.profiles p
join public.user_badges ub on ub.user_id = p.id
where ub.badge_code = 'pk_keywords'
  and lower(concat_ws(' ', p.full_name, p.username)) like '%izam%'
order by ub.created_at desc nulls last;
