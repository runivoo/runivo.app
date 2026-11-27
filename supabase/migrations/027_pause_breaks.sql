-- Pauses split the trail (runEngine ENGINE.PAUSE_BREAK_M, EnginePoint.brk).
-- The app marks the first GPS point after a pause with "brk": true. The stretch
-- into that point is never distance or ground (the engine skips it), so the
-- integrity check must not judge it either: pausing, riding 2 km and resuming
-- used to read as a "vehicle" run. Marking points this way only ever removes
-- distance and ground, so a client gains nothing by setting it.

CREATE OR REPLACE FUNCTION public.run_integrity_reason(points jsonb, activity text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  pt jsonb; plat float8; plng float8; pts float8; lat float8; lng float8; ts float8;
  a float8; d float8; dt float8; fast_m float8 := 0;
  on_foot boolean := COALESCE(activity, 'run') IN ('run', 'trail_run', 'trail', 'walk', 'hike');
BEGIN
  IF jsonb_typeof(points) IS DISTINCT FROM 'array' THEN RETURN NULL; END IF;
  FOR pt IN SELECT * FROM jsonb_array_elements(points) LOOP
    lat := (pt->>'lat')::float8; lng := (pt->>'lng')::float8; ts := (pt->>'timestamp')::float8;
    IF lat IS NULL OR lng IS NULL THEN CONTINUE; END IF;
    -- The first point after a pause: no comparison with the point before it.
    IF plat IS NOT NULL AND (pt->>'brk') IS DISTINCT FROM 'true' THEN
      a := sin(radians(lat - plat) / 2) ^ 2 + cos(radians(plat)) * cos(radians(lat)) * sin(radians(lng - plng) / 2) ^ 2;
      d := 6371000 * 2 * atan2(sqrt(a), sqrt(1 - a));
      dt := CASE WHEN ts IS NOT NULL AND pts IS NOT NULL AND ts > pts THEN (ts - pts) / 1000.0 ELSE NULL END;
      IF (dt IS NULL AND d >= 1000) OR (dt IS NOT NULL AND d >= 250 AND d / dt >= 15) THEN
        RETURN 'teleport';
      END IF;
      IF on_foot AND dt IS NOT NULL AND d / dt > 8 THEN
        fast_m := fast_m + d;
        IF fast_m >= 1000 THEN RETURN 'vehicle'; END IF;
      END IF;
    END IF;
    plat := lat; plng := lng; pts := ts;
  END LOOP;
  RETURN NULL;
END;
$$;
