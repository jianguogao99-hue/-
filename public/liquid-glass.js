/* Vanilla port of the liquid-glass-react technique
 * (https://github.com/rdev/liquid-glass-react, itself adapted from shuding/liquid-glass).
 * iPad Safari is the primary look: frosted backdrop-filter + specular rim.
 * SVG feDisplacementMap refraction is a Chromium-only progressive enhancement.
 */
(function (global) {
  'use strict';

  var FILTER_ID = 'wenji-liquid-glass';
  var DISPLACEMENT_SCALE = 52;
  var ABERRATION = 2;
  var MAP_MAX = 280;

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function roundedRectSDF(x, y, width, height, radius) {
    var qx = Math.abs(x) - width + radius;
    var qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  function liquidGlassFragment(uv) {
    var ix = uv.x - 0.5;
    var iy = uv.y - 0.5;
    var distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
    var displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
    var scaled = smoothStep(0, 1, displacement);
    return { x: ix * scaled + 0.5, y: iy * scaled + 0.5 };
  }

  function generateDisplacementMap(width, height) {
    var w = Math.max(8, Math.round(width));
    var h = Math.max(8, Math.round(height));
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var context = canvas.getContext('2d');
    if (!context) return '';
    var raw = [];
    var maxScale = 1;
    var y, x, uv, pos, dx, dy, edgeDistance, edgeFactor, r, g, pixelIndex;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        uv = { x: x / w, y: y / h };
        pos = liquidGlassFragment(uv);
        dx = pos.x * w - x;
        dy = pos.y * h - y;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        raw.push(dx, dy);
      }
    }
    var imageData = context.createImageData(w, h);
    var data = imageData.data;
    var rawIndex = 0;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        dx = raw[rawIndex++];
        dy = raw[rawIndex++];
        edgeDistance = Math.min(x, y, w - x - 1, h - y - 1);
        edgeFactor = Math.min(1, edgeDistance / 2);
        r = (dx * edgeFactor) / maxScale + 0.5;
        g = (dy * edgeFactor) / maxScale + 0.5;
        pixelIndex = (y * w + x) * 4;
        data[pixelIndex] = Math.max(0, Math.min(255, r * 255));
        data[pixelIndex + 1] = Math.max(0, Math.min(255, g * 255));
        data[pixelIndex + 2] = Math.max(0, Math.min(255, g * 255));
        data[pixelIndex + 3] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  function reducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function canDisplace() {
    if (reducedMotion()) return false;
    var ua = navigator.userAgent || '';
    var isiOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isFirefox = /Firefox|FxiOS/i.test(ua);
    var isAppleWebKit = /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg\/|OPR\//i.test(ua);
    if (isiOS || isFirefox || isAppleWebKit) return false;
    return true;
  }

  function mapSize(width, height) {
    var longSide = Math.max(width, height, 1);
    var scale = Math.min(1, MAP_MAX / longSide);
    return {
      width: Math.max(24, Math.round(width * scale)),
      height: Math.max(16, Math.round(height * scale))
    };
  }

  function ensureFilterSvg() {
    var existing = document.getElementById('liquidGlassSvg');
    if (existing) return existing;
    var svgNS = 'http://www.w3.org/2000/svg';
    var xlink = 'http://www.w3.org/1999/xlink';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'liquidGlassSvg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('liquid-glass-svg');
    var defs = document.createElementNS(svgNS, 'defs');
    var filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', FILTER_ID);
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    function el(name, attrs) {
      var node = document.createElementNS(svgNS, name);
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
      return node;
    }

    var feImage = el('feImage', {
      id: 'wenjiGlassMap',
      x: '0',
      y: '0',
      width: '100%',
      height: '100%',
      result: 'DISPLACEMENT_MAP',
      preserveAspectRatio: 'xMidYMid slice'
    });

    var red = el('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'DISPLACEMENT_MAP',
      scale: String(DISPLACEMENT_SCALE),
      xChannelSelector: 'R',
      yChannelSelector: 'B',
      result: 'RED_DISPLACED'
    });
    var redMat = el('feColorMatrix', {
      in: 'RED_DISPLACED',
      type: 'matrix',
      values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
      result: 'RED_CHANNEL'
    });
    var green = el('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'DISPLACEMENT_MAP',
      scale: String(DISPLACEMENT_SCALE - ABERRATION * 0.05 * DISPLACEMENT_SCALE),
      xChannelSelector: 'R',
      yChannelSelector: 'B',
      result: 'GREEN_DISPLACED'
    });
    var greenMat = el('feColorMatrix', {
      in: 'GREEN_DISPLACED',
      type: 'matrix',
      values: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
      result: 'GREEN_CHANNEL'
    });
    var blue = el('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'DISPLACEMENT_MAP',
      scale: String(DISPLACEMENT_SCALE - ABERRATION * 0.1 * DISPLACEMENT_SCALE),
      xChannelSelector: 'R',
      yChannelSelector: 'B',
      result: 'BLUE_DISPLACED'
    });
    var blueMat = el('feColorMatrix', {
      in: 'BLUE_DISPLACED',
      type: 'matrix',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
      result: 'BLUE_CHANNEL'
    });
    var gb = el('feBlend', { in: 'GREEN_CHANNEL', in2: 'BLUE_CHANNEL', mode: 'screen', result: 'GB_COMBINED' });
    var rgb = el('feBlend', { in: 'RED_CHANNEL', in2: 'GB_COMBINED', mode: 'screen', result: 'RGB_COMBINED' });
    var blur = el('feGaussianBlur', { in: 'RGB_COMBINED', stdDeviation: '0.3', result: 'ABERRATED' });

    [feImage, red, redMat, green, greenMat, blue, blueMat, gb, rgb, blur].forEach(function (node) {
      filter.appendChild(node);
    });
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.appendChild(svg);
    svg._feImage = feImage;
    svg._xlink = xlink;
    return svg;
  }

  function setMapHref(feImage, url) {
    feImage.setAttribute('href', url);
    try { feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url); } catch (e) {}
  }

  function ensureLayers(form) {
    form.classList.add('liquid-glass');
    if (!form.querySelector('.glass-material')) {
      var material = document.createElement('div');
      material.className = 'glass-material';
      material.setAttribute('aria-hidden', 'true');
      material.innerHTML = '<div class="glass-backdrop"></div><div class="glass-specularity"></div><div class="glass-rim"></div><div class="glass-rim glass-rim-overlay"></div>';
      form.insertBefore(material, form.firstChild);
    }
    return form.querySelector('.glass-backdrop');
  }

  function applyDisplacement(form, backdrop) {
    if (!canDisplace()) {
      form.classList.remove('has-displacement');
      backdrop.style.removeProperty('backdrop-filter');
      backdrop.style.removeProperty('-webkit-backdrop-filter');
      return;
    }
    var rect = form.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    var size = mapSize(rect.width, rect.height);
    var url = generateDisplacementMap(size.width, size.height);
    if (!url) return;
    var svg = ensureFilterSvg();
    setMapHref(svg._feImage, url);
    var filter = 'url(#' + FILTER_ID + ')';
    var frost = 'blur(var(--glass-blur)) saturate(var(--glass-sat))';
    backdrop.style.backdropFilter = filter + ' ' + frost;
    backdrop.style.webkitBackdropFilter = filter + ' ' + frost;
    form.classList.add('has-displacement');
  }

  function mount(form) {
    if (!form || form.dataset.liquidGlassMounted) return;
    var backdrop = ensureLayers(form);
    form.dataset.liquidGlassMounted = 'true';
    var frame = 0;
    function reserveTranscript() {
      var panel = form.closest('#chatPanel');
      if (!panel) return;
      var rect = form.getBoundingClientRect();
      var bottomGap = parseFloat(getComputedStyle(form).bottom) || 0;
      if (rect.height > 0) panel.style.setProperty('--composer-reserve', Math.ceil(rect.height + bottomGap + 14) + 'px');
    }
    function refresh() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { reserveTranscript(); applyDisplacement(form, backdrop); });
    }
    refresh();
    if (typeof ResizeObserver === 'function') {
      var observer = new ResizeObserver(refresh);
      observer.observe(form);
    } else {
      window.addEventListener('resize', refresh);
    }
    if (window.matchMedia) {
      var media = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onMotion = function () { refresh(); };
      if (media.addEventListener) media.addEventListener('change', onMotion);
      else if (media.addListener) media.addListener(onMotion);
    }
  }

  function init() {
    mount(document.getElementById('form'));
  }

  global.WenjiLiquidGlass = {
    generateDisplacementMap: generateDisplacementMap,
    roundedRectSDF: roundedRectSDF,
    canDisplace: canDisplace,
    mount: mount
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
