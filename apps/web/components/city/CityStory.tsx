'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { CHAPTERS, storyProgress } from '@/lib/city/timeline';
import { CITY_COPY as C } from '@/content/city';
import type { CityScene } from './cityScene';
import '@/styles/city.css';

const chapter = (id: string) => CHAPTERS.find(c => c.id === id)!;

/** True when the browser can draw WebGL (the test context is released straight away). */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * The landing page's scroll story: a 3D paper city that follows a runner as you scroll, with a chapter of text
 * for each feature. The chapters are plain HTML (so they are in the page for search and screen readers); the 3D
 * scene is loaded afterwards and driven by how far through this section you have scrolled.
 *
 * `fallback` (the static hero and feature blocks) takes over when the visitor prefers reduced motion or has
 * Save-Data on, when WebGL is missing, or when the scene fails to start.
 */
export function CityStory({ fallback }: { fallback: ReactNode }) {
  const [mode, setMode] = useState<'story' | 'static'>('story');
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || saveData || !hasWebGL()) { setMode('static'); return; }

    let cancelled = false;
    let scene: CityScene | null = null;
    let teardown = () => {};

    (async () => {
      const { createCityScene } = await import('./cityScene');
      const sec = section.current, st = stage.current;
      if (cancelled || !sec || !st) return;
      const s = createCityScene(st, { me: '/city/me.jpg', aanya: '/city/aanya.jpg' });
      if (!s) { setMode('static'); return; }
      scene = s;

      const read = (snap = false) => {
        const r = sec.getBoundingClientRect();
        s.setProgress(storyProgress(r.top, r.height, window.innerHeight), snap);
      };
      const onScroll = () => read();
      read(true);
      const io = new IntersectionObserver(([e]) => s.setActive(e.isIntersecting), { rootMargin: '10% 0px' });
      io.observe(sec);
      const ro = new ResizeObserver(() => { s.resize(); read(); });
      ro.observe(st);
      window.addEventListener('scroll', onScroll, { passive: true });
      teardown = () => { io.disconnect(); ro.disconnect(); window.removeEventListener('scroll', onScroll); };
    })().catch(err => { console.error('[city story] could not start, showing the static page', err); setMode('static'); });

    return () => { cancelled = true; teardown(); scene?.dispose(); };
  }, []);

  if (mode === 'static') return <>{fallback}</>;

  const th = C.thought;
  const t = C.tags;
  return (
    <>
      <section ref={section} className="city" aria-label="How Runivo works">
        <div ref={stage} className="city-pin">
          <h1 className="sr-only">{C.h1}</h1>
          <canvas data-id="stage" aria-hidden="true" />
          <span id="waitlist" className="city-anchor" aria-hidden="true" />

          <section className="panel thought" data-in={chapter('thought').in} data-out={chapter('thought').out}>
            <div className="ln" data-id="th1" style={{ opacity: 1 }}><h2>{th[0][0]}</h2><p className="lead">{th[0][1]}</p></div>
            <div className="ln" data-id="th2" style={{ opacity: 0 }}><h2>{th[1][0]}</h2><p className="lead">{th[1][1]}</p></div>
            <div className="ln" data-id="th3" style={{ opacity: 0 }}><h2>{th[2][0]}</h2><p className="lead">{th[2][1]}</p></div>
            <div className="scroll-cue" data-id="cue"><span />{C.scroll}</div>
          </section>

          <section className="panel" data-in={chapter('track').in} data-out={chapter('track').out}>
            <p className="eyebrow">{C.track.eyebrow}</p>
            <h2>{C.track.title}</h2>
            <p className="lead">{C.track.lead}</p>
            <div className="stats">
              <div className="stat"><b data-id="sKm">0.00</b><span>{C.track.stats[0]}</span></div>
              <div className="stat"><b data-id="sTime">0:00</b><span>{C.track.stats[1]}</span></div>
              <div className="stat"><b>5:44</b><span>{C.track.stats[2]}</span></div>
            </div>
          </section>

          <section className="panel" data-in={chapter('claim').in} data-out={chapter('claim').out}>
            <p className="eyebrow">{C.claim.eyebrow}</p>
            <h2>{C.claim.title}</h2>
            <p className="lead">{C.claim.lead}</p>
            <div className="rule">{C.claim.rule}</div>
          </section>

          <section className="panel" data-in={chapter('pacex').in} data-out={chapter('pacex').out}>
            <p className="eyebrow">{C.pacex.eyebrow}</p>
            <h2>{C.pacex.title}</h2>
            <p className="lead">{C.pacex.lead}</p>
            <div className="debrief">
              <h3><em>PaceX</em>{C.pacex.card}</h3>
              {[1, 2, 3].map(n => (
                <div key={n} className="chk" data-id={`c${n}`}>
                  <span className="bx"><svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true"><path d="m2.5 6.2 2.2 2.2 4.8-4.8" /></svg></span>
                  <span className="tx" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel" data-in={chapter('store').in} data-out={chapter('store').out}>
            <p className="eyebrow">{C.store.eyebrow}</p>
            <h2>{C.store.title}</h2>
            <p className="lead">{C.store.lead}</p>
            <div className="ptsrow">
              <div><b className="o" data-id="ptsRun">+0</b><span>{C.store.run}</span></div>
              <div><b data-id="ptsBal">0</b><span>{C.store.balance}</span></div>
            </div>
            <div className="hint"><i /><span data-id="coinHint">{C.store.hintMouse}</span></div>
            <p className="store-note">{C.store.note}</p>
          </section>

          <section className="panel" data-in={chapter('friends').in} data-out={chapter('friends').out}>
            <p className="eyebrow">{C.friends.eyebrow}</p>
            <h2>{C.friends.title}</h2>
            <p className="lead">{C.friends.lead}</p>
            <div className="hint"><i />{C.friends.hint}</div>
          </section>

          <section className="panel" data-in={chapter('rivals').in} data-out={chapter('rivals').out}>
            <p className="eyebrow" style={{ color: '#B8690A' }}>{C.rivals.eyebrow}</p>
            <h2>{C.rivals.title}</h2>
            <p className="lead">{C.rivals.lead}</p>
          </section>

          <section className="panel final" data-in={chapter('final').in} data-out={chapter('final').out}>
            <div className="box">
              <h2>{C.final.title} <span className="acc">{C.final.accent}</span></h2>
              <p className="lead">{C.final.lead}</p>
              <WaitlistForm source="web" />
            </div>
          </section>

          {/* labels that follow things in the scene; decorative */}
          <div aria-hidden="true">
            <div className="tag o" data-id="tZone"><i />{t.zone}</div>
            <div className="tag w" data-id="tPace"><i />{t.pace}</div>
            <div className="tag" data-id="tDone"><i />{t.done}</div>
            <div className="tag o" data-id="tPts"><i /><span data-id="ptsTag">+0 PACE</span></div>
            <div className="tag o" data-id="tKudos"><i />{t.kudos}</div>
            <div className="tag b" data-id="tBack"><i />{t.back}</div>
            <div className="tag w" data-id="tRahul"><i />{t.rahul}</div>
            <div className="tag w" data-id="tMei"><i />{t.mei}</div>
            <div className="tag am" data-id="tKabir"><i />{t.kabir}</div>
            <div className="tag o" data-id="tTaken"><i />{t.taken}</div>
          </div>

          <div className="friend" data-id="aanya" inert>
            <div className="top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="av" data-id="aanyaAv" alt="" width={40} height={40} />
              <div>
                <div className="nm">{C.friend.name}</div>
                <div className="mt">{C.friend.meta} <span className="live"><i />{C.friend.live}</span></div>
              </div>
            </div>
            <div className="acts">
              <button className="btn btn-orange" data-id="bKudos" type="button">{C.friend.kudos} <span className="kc" data-id="kCount">{C.friend.kudosStart}</span></button>
              <button className="btn btn-surface" data-id="bCheer" type="button">{C.friend.cheer}</button>
            </div>
          </div>

          <div className="rewards" data-id="rewards" inert>
            {C.store.rewards.map(r => (
              <div key={r.name} className="rw" data-cost={r.cost}>
                <div className="k">{r.kind}</div>
                <div className="n">{r.name}</div>
                <div className="pr">{r.cost} <small>PACE</small></div>
                <div className="bar"><i /></div>
                <div className="ft"><span className="st" /><button className="btn btn-dark" type="button">{C.reward.redeem}</button></div>
              </div>
            ))}
          </div>

          <p className="caption">{C.illustration}</p>
        </div>
      </section>
    </>
  );
}
