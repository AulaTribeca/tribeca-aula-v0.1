-- v264: same effective academic schedule as teacher; whole-month pause; preserve closed amounts.
-- Only the authenticated student's own data are returned; no private notes.
CREATE OR REPLACE FUNCTION public.tribeca_student_monthly_payment_summary_v263()
 RETURNS TABLE(month text, amount numeric, status text, paid_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog, public, pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_bill public.student_billing%ROWTYPE;
  v_start date;
  v_end date;
  v_current date := date_trunc('month', (now() AT TIME ZONE 'Europe/Madrid')::date)::date;
  v_payment public.payment_months%ROWTYPE;
  v_computed numeric;
  v_hourly numeric;
  v_extras numeric;
  v_collected numeric;
  v_count_paid integer;
  v_count_due integer;
  v_paid_last date;
  v_month text;
  v_amount numeric;
  v_paid boolean;
  v_date date;
BEGIN
  -- The signed-in, active student is the only possible lookup identity.
  -- No user-id, table name, or arbitrary query argument is accepted.
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=v_uid AND p.role='student' AND p.active IS TRUE
      AND COALESCE(p.archived,false)=false
  ) THEN
    RAISE EXCEPTION 'Acceso restringido al alumnado activo'
      USING ERRCODE='42501';
  END IF;

  SELECT b.* INTO v_bill
  FROM public.student_billing b WHERE b.user_id=v_uid;
  IF NOT FOUND THEN RETURN; END IF;

  -- Current and recent calendar months, never earlier than the start date.
  FOR v_start IN
    SELECT (v_current - (i || ' months')::interval)::date
      FROM generate_series(11,0,-1) AS i
  LOOP
    v_end:=(v_start + INTERVAL '1 month - 1 day')::date;
    IF v_bill.billing_start_date IS NOT NULL
       AND v_end<v_bill.billing_start_date THEN CONTINUE; END IF;
    v_month:=to_char(v_start,'YYYY-MM');
    SELECT pm.* INTO v_payment FROM public.payment_months pm
      WHERE pm.user_id=v_uid AND pm.month=v_month;
    IF NOT FOUND THEN v_payment:=NULL; END IF;

    v_computed:=GREATEST(0,COALESCE(v_bill.monthly_fee,0));
    IF v_bill.tariff_type IN ('individual','mixed') THEN
      -- Full hourly duration for scheduled classes; absences do not count.
      -- For confirmed_only, only explicitly registered attendance counts.
      SELECT COALESCE(SUM(
        GREATEST(0,EXTRACT(EPOCH FROM (ss.end_time-ss.start_time))/3600.0)
        * COALESCE(v_bill.class_rate,0)),0)
      INTO v_hourly
      FROM public.student_schedules ss
      JOIN generate_series(v_start,v_end,interval '1 day') AS d(day)
        ON EXTRACT(ISODOW FROM d.day)::integer=ss.weekday
      LEFT JOIN public.attendance_records a
        ON a.user_id=v_uid AND a.class_date=d.day::date
        AND a.scheduled_start=ss.start_time
      WHERE ss.user_id=v_uid AND ss.active=true
        AND (v_bill.tariff_type='individual' OR ss.class_type='individual')
        -- Match the effective course/summer season used by the teacher timetable.
        AND COALESCE(NULLIF(lower(ss.schedule_season),''),NULLIF(lower(ss.season),''),'school')=(
          CASE WHEN EXISTS (
            SELECT 1 FROM public.student_schedules preferred_ss
            WHERE preferred_ss.user_id=v_uid AND preferred_ss.active=true
              AND (preferred_ss.valid_from IS NULL OR d.day::date>=preferred_ss.valid_from)
              AND (preferred_ss.valid_to IS NULL OR d.day::date<=preferred_ss.valid_to)
              AND COALESCE(NULLIF(lower(preferred_ss.schedule_season),''),NULLIF(lower(preferred_ss.season),''),'school')=(CASE WHEN EXTRACT(MONTH FROM d.day::date) IN (7,8) OR (EXTRACT(MONTH FROM d.day::date)=6 AND EXTRACT(DAY FROM d.day::date)>=25) THEN 'summer' ELSE 'school' END)
          ) THEN (CASE WHEN EXTRACT(MONTH FROM d.day::date) IN (7,8) OR (EXTRACT(MONTH FROM d.day::date)=6 AND EXTRACT(DAY FROM d.day::date)>=25) THEN 'summer' ELSE 'school' END)
          ELSE (CASE WHEN (CASE WHEN EXTRACT(MONTH FROM d.day::date) IN (7,8) OR (EXTRACT(MONTH FROM d.day::date)=6 AND EXTRACT(DAY FROM d.day::date)>=25) THEN 'summer' ELSE 'school' END)='school' THEN 'summer' ELSE 'school' END)
          END
        )
        AND ss.end_time>ss.start_time
        AND (ss.valid_from IS NULL OR d.day::date>=ss.valid_from)
        AND (ss.valid_to IS NULL OR d.day::date<=ss.valid_to)
        AND (v_bill.billing_start_date IS NULL OR d.day::date>=v_bill.billing_start_date)
        AND NOT EXISTS (
          SELECT 1 FROM public.student_pauses sp
          WHERE sp.user_id=v_uid AND sp.active=true
            AND sp.start_date<=d.day::date
            AND (sp.end_date IS NULL OR sp.end_date>=d.day::date)
        )
        AND CASE
          WHEN v_bill.attendance_policy='confirmed_only' THEN a.status='present'
          ELSE COALESCE(a.status,'present') NOT IN ('absent','justified','cancelled')
        END;

      -- Extra one-off classes which are not already counted in schedules.
      SELECT COALESCE(SUM(
        GREATEST(0,EXTRACT(EPOCH FROM (a.scheduled_end-a.scheduled_start))/3600.0)
        * COALESCE(v_bill.class_rate,0)),0)
      INTO v_extras
      FROM public.attendance_records a
      WHERE a.user_id=v_uid AND a.status='present'
        AND a.class_date BETWEEN v_start AND v_end
        AND (v_bill.tariff_type='individual' OR a.class_type='individual')
        AND a.scheduled_end>a.scheduled_start
        AND (v_bill.billing_start_date IS NULL OR a.class_date>=v_bill.billing_start_date)
        AND NOT EXISTS (
          SELECT 1 FROM public.student_pauses sp
          WHERE sp.user_id=v_uid AND sp.active=true
            AND sp.start_date<=a.class_date
            AND (sp.end_date IS NULL OR sp.end_date>=a.class_date)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.student_schedules ss
          WHERE ss.user_id=v_uid AND ss.active=true
            AND ss.weekday=EXTRACT(ISODOW FROM a.class_date)::integer
            AND ss.start_time=a.scheduled_start
            AND (ss.valid_from IS NULL OR a.class_date>=ss.valid_from)
            AND (ss.valid_to IS NULL OR a.class_date<=ss.valid_to)
            AND (v_bill.tariff_type='individual' OR ss.class_type='individual')
            -- A summer slot must not suppress a real extra class in term time.
            AND COALESCE(NULLIF(lower(ss.schedule_season),''),NULLIF(lower(ss.season),''),'school')=(
          CASE WHEN EXISTS (
            SELECT 1 FROM public.student_schedules preferred_ss
            WHERE preferred_ss.user_id=v_uid AND preferred_ss.active=true
              AND (preferred_ss.valid_from IS NULL OR a.class_date>=preferred_ss.valid_from)
              AND (preferred_ss.valid_to IS NULL OR a.class_date<=preferred_ss.valid_to)
              AND COALESCE(NULLIF(lower(preferred_ss.schedule_season),''),NULLIF(lower(preferred_ss.season),''),'school')=(CASE WHEN EXTRACT(MONTH FROM a.class_date) IN (7,8) OR (EXTRACT(MONTH FROM a.class_date)=6 AND EXTRACT(DAY FROM a.class_date)>=25) THEN 'summer' ELSE 'school' END)
          ) THEN (CASE WHEN EXTRACT(MONTH FROM a.class_date) IN (7,8) OR (EXTRACT(MONTH FROM a.class_date)=6 AND EXTRACT(DAY FROM a.class_date)>=25) THEN 'summer' ELSE 'school' END)
          ELSE (CASE WHEN (CASE WHEN EXTRACT(MONTH FROM a.class_date) IN (7,8) OR (EXTRACT(MONTH FROM a.class_date)=6 AND EXTRACT(DAY FROM a.class_date)>=25) THEN 'summer' ELSE 'school' END)='school' THEN 'summer' ELSE 'school' END)
          END
        )
        );
      v_computed:=CASE WHEN v_bill.tariff_type='individual' THEN 0
                   ELSE GREATEST(0,COALESCE(v_bill.monthly_fee,0)) END
                   + COALESCE(v_hourly,0)+COALESCE(v_extras,0);
    END IF;

    -- A whole month paused has no newly generated fee. An existing closed
    -- teacher snapshot is still authoritative (handled below).
    IF EXISTS (
      SELECT 1 FROM public.student_pauses whole_pause
      WHERE whole_pause.user_id=v_uid
        AND (whole_pause.active=true OR whole_pause.end_date IS NOT NULL)
        AND whole_pause.start_date<=v_start
        AND (whole_pause.end_date IS NULL OR whole_pause.end_date>=v_end)
    ) THEN
      v_computed:=0;
    END IF;

    v_amount:=ROUND(v_computed,2);
    v_paid:=COALESCE(v_payment.paid,false);
    v_date:=CASE WHEN v_paid THEN v_payment.paid_date ELSE NULL END;

    -- Per-session settlements always have priority over the stale monthly
    -- paid flag: a newly attended class must become pending separately.
    IF v_bill.session_settlement_enabled=true
      AND v_bill.tariff_type='individual' THEN
      SELECT COALESCE(SUM(s.paid_amount),0), COUNT(*),
             MAX(s.paid_date)
      INTO v_collected,v_count_paid,v_paid_last
      FROM public.individual_class_settlements_v258 s
      JOIN public.attendance_records a ON a.id=s.attendance_id
      WHERE s.user_id=v_uid AND a.class_date BETWEEN v_start AND v_end;
      SELECT COUNT(*) INTO v_count_due
      FROM public.attendance_records a
      WHERE a.user_id=v_uid AND a.class_date BETWEEN v_start AND v_end
        AND a.status='present' AND a.class_type='individual'
        AND (v_bill.billing_start_date IS NULL OR a.class_date>=v_bill.billing_start_date)
        AND NOT EXISTS (
          SELECT 1 FROM public.student_pauses sp
          WHERE sp.user_id=v_uid AND sp.active=true
            AND sp.start_date<=a.class_date
            AND (sp.end_date IS NULL OR sp.end_date>=a.class_date)
        );
      v_paid := v_count_due>0 AND v_count_paid>=v_count_due
                AND v_collected+0.005>=v_amount;
      v_date := CASE WHEN v_paid THEN v_paid_last ELSE NULL END;
    ELSIF v_paid AND v_payment.amount_due_snapshot IS NOT NULL THEN
      -- Teacher's closed historic monthly amount must not be recalculated
      -- with today's rate or schedule.
      v_amount:=v_payment.amount_due_snapshot;
    END IF;

    month:=v_month;
    amount:=v_amount;
    status:=CASE WHEN v_paid THEN 'paid' ELSE 'pending' END;
    paid_date:=v_date;
    RETURN NEXT;
  END LOOP;
END
$function$;

REVOKE ALL ON FUNCTION public.tribeca_student_monthly_payment_summary_v263() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tribeca_student_monthly_payment_summary_v263() TO authenticated;
