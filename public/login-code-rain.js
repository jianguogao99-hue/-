(() => {
 const canvas = document.querySelector('#codeRain');
 const welcome = document.querySelector('#authWelcome');
 const nut = welcome.querySelector('img');
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
 const colors = ['#a9dcff', '#f9bbdc', '#b9bbff'];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let width, height, drops, frame = 0, previous = 0;
 const random = (min, max) => min + Math.random() * (max - min);

 function makeDrop(y) {
  const size = random(10, 19);
  return {
   x: random(0, width), y, size, speed: size * random(5, 10),
   vx: 0, bounced: false, opacity: random(.38, .85),
   glyph: alphabet[Math.floor(Math.random() * alphabet.length)],
   color: colors[Math.floor(Math.random() * colors.length)]
  };
 }

 function resize() {
  if (welcome.hidden) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = Math.min(230, Math.max(60, Math.round(width * height / 4200)));
  drops = Array.from({length: count}, () => makeDrop(random(-40, height)));
 }

 function draw(time) {
  frame = 0;
  if (document.hidden || welcome.hidden || !drops) return;
  const dt = previous && !reduced.matches ? Math.min(.035, (time - previous) / 1000) : 0;
  previous = time;
  const bounds = nut.getBoundingClientRect();
  const center = bounds.left + bounds.width / 2;
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < drops.length; i++) {
   let d = drops[i];
   const oldY = d.y;
   d.x += d.vx * dt;
   d.y += d.speed * dt;
   const lateral = (d.x - center) / (bounds.width * .34);
   const shoulder = bounds.top + bounds.height * (.16 + lateral * lateral * .28);
   if (!d.bounced && Math.abs(lateral) < 1 && oldY < shoulder && d.y >= shoulder) {
    d.bounced = true;
    d.vx = (lateral < 0 ? -1 : 1) * random(55, 110);
    d.speed = -random(35, 65);
   }
   if (d.bounced) d.speed += 300 * dt;
   if (d.y > height + 28 || d.x < -24 || d.x > width + 24) {
    d = drops[i] = makeDrop(random(-85, -14));
   }
   ctx.globalAlpha = d.opacity * .28;
   ctx.fillStyle = d.color;
   ctx.fillRect(d.x + 2, d.y - d.size * 2, 2, d.size * .55);
   ctx.globalAlpha = d.opacity * .55;
   ctx.fillRect(d.x + 2, d.y - d.size * 1.45, 2, d.size * .4);
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
  if (document.hidden || welcome.hidden) return;
  resize();
  frame = requestAnimationFrame(draw);
 }

 window.addEventListener('resize', refresh, {passive: true});
 document.addEventListener('visibilitychange', refresh);
 reduced.addEventListener('change', refresh);
 new MutationObserver(refresh).observe(welcome, {attributes: true, attributeFilter: ['hidden']});
 refresh();
})();
