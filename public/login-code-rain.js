(() => {
 const canvas = document.querySelector('#codeRain');
 const welcome = document.querySelector('#authWelcome');
 const nut = welcome.querySelector('img');
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
 const colors = ['#a9dcff', '#f9bbdc', '#b9bbff'];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let width, height, drops, bounds, frame = 0, previous = 0;
 const random = (min, max) => min + Math.random() * (max - min);

 function makeDrop(y) {
  const size = random(9, 16);
  return {
   x: random(0, width), y, size, vx: 0, bounced: false, speed: random(165, 340),
   opacity: random(.35, .92),
   glyph: alphabet[Math.floor(Math.random() * alphabet.length)],
   color: colors[Math.floor(Math.random() * colors.length)]
  };
 }

 function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  bounds = nut.getBoundingClientRect();
  const count = Math.min(460, Math.max(135, Math.round(width * height / 1550)));
  drops = Array.from({length: count}, () => makeDrop(random(-40, height)));
 }

 function draw(time) {
  frame = 0;
  if (document.hidden || !drops) return;
  const dt = previous && !reduced.matches ? Math.min(.035, (time - previous) / 1000) : 0;
  previous = time;
  const center = bounds.left + bounds.width / 2;
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < drops.length; i++) {
   let d = drops[i];
   const oldY = d.y;
   const oldX = d.x;
   if (d.bounced) d.speed += 560 * dt;
   d.x += d.vx * dt;
   d.y += d.speed * dt;
   const lateral = (d.x - center) / (bounds.width * .46);
   const shoulder = bounds.top + bounds.height * (.05 + lateral * lateral * .34);
   if (!welcome.hidden && !d.bounced && Math.abs(lateral) < 1 && oldY < shoulder && d.y >= shoulder) {
    d.x = oldX;
    d.y = shoulder;
    d.bounced = true;
    d.vx = (lateral < 0 ? -1 : 1) * random(100, 185);
    d.speed = -random(90, 155);
   }
   if (d.y > height + 28 || d.x < -35 || d.x > width + 35) d = drops[i] = makeDrop(random(-70, -14));
   const tail = d.bounced ? 8 : d.speed * .11;
   ctx.fillStyle = d.color;
   ctx.globalAlpha = d.opacity * .2;
   ctx.fillRect(d.x + 2, d.y - d.size - tail, 1, tail);
   ctx.globalAlpha = d.opacity * .66;
   ctx.fillRect(d.x + 2, d.y - d.size - tail * .44, 1.7, tail * .44);
   ctx.globalAlpha = d.opacity;
   ctx.fillStyle = '#f4f8ff';
   ctx.font = d.size.toFixed(0) + 'px monospace';
   ctx.fillText(d.glyph, d.x, d.y);
  }
  ctx.globalAlpha = 1;
  if (!reduced.matches) frame = requestAnimationFrame(draw);
 }

 function refresh() {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  if (document.hidden) return;
  resize();
  frame = requestAnimationFrame(draw);
 }

 window.addEventListener('resize', refresh, {passive: true});
 document.addEventListener('visibilitychange', refresh);
 reduced.addEventListener('change', refresh);
 new MutationObserver(() => { if (!welcome.hidden) bounds = nut.getBoundingClientRect(); }).observe(welcome, {attributes: true, attributeFilter: ['hidden']});
 if (!nut.complete) nut.addEventListener('load', refresh, {once:true});
 refresh();
})();
