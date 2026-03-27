import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DRAWING_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{
  background:#F0F4FF;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  padding:10px 14px;gap:10px;
}

/* ── Anzeige ── */
#display{
  width:100%;background:#fff;
  border:3px solid #6C3CE1;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-size:58px;font-weight:900;color:#6C3CE1;
  letter-spacing:8px;padding:6px 0;
  box-shadow:0 2px 8px rgba(108,60,225,.15);
  position:relative;overflow:hidden;
}
#display.empty{color:#D1D5DB}

/* ── Ziffernblock ── */
#pad{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:8px;width:100%;
}
.key{
  background:#fff;border:none;border-radius:16px;
  font-size:30px;font-weight:800;color:#1A1A2E;
  padding:14px 0;
  box-shadow:0 4px 0 #C7D2FE;
  cursor:pointer;
  position:relative;overflow:hidden;
  transition:transform 0.08s;
}
.key:active{transform:translateY(2px);box-shadow:0 2px 0 #C7D2FE;}
.key-del{background:#FFE4E4;color:#EF4444;font-size:22px;box-shadow:0 4px 0 #FECACA;}
.key-del:active{box-shadow:0 2px 0 #FECACA;}
.key-ok{background:#4CAF50;color:#fff;box-shadow:0 4px 0 #2E7D32;font-size:22px;}
.key-ok:active{box-shadow:0 2px 0 #2E7D32;}

/* ── Ripple-Effekt ── */
.ripple{
  position:absolute;border-radius:50%;
  background:rgba(108,60,225,0.15);
  transform:scale(0);animation:rippleAnim 0.4s ease-out forwards;
  pointer-events:none;
}
@keyframes rippleAnim{
  to{transform:scale(2.5);opacity:0}
}

/* ── Konfetti ── */
.confetti{
  position:fixed;width:8px;height:8px;border-radius:2px;
  pointer-events:none;z-index:100;
  animation:confettiFall 1s ease-out forwards;
}
@keyframes confettiFall{
  0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}
  100%{opacity:0;transform:translateY(120vh) rotate(720deg) scale(0.3)}
}
</style>
</head>
<body>

<div id="display" class="empty">—</div>

<div id="pad">
  <button class="key" ontouchstart="tap('1',event)">1</button>
  <button class="key" ontouchstart="tap('2',event)">2</button>
  <button class="key" ontouchstart="tap('3',event)">3</button>
  <button class="key" ontouchstart="tap('4',event)">4</button>
  <button class="key" ontouchstart="tap('5',event)">5</button>
  <button class="key" ontouchstart="tap('6',event)">6</button>
  <button class="key" ontouchstart="tap('7',event)">7</button>
  <button class="key" ontouchstart="tap('8',event)">8</button>
  <button class="key" ontouchstart="tap('9',event)">9</button>
  <button class="key key-del" ontouchstart="tap('del',event)">⌫</button>
  <button class="key" ontouchstart="tap('0',event)">0</button>
  <button class="key key-ok" ontouchstart="tap('ok',event)">✓</button>
</div>

<script>
var typed = '';
var lastTap = 0;

function tap(key, evt) {
  // Prevent ghost click that follows touchstart (~300ms later)
  if (evt) { evt.preventDefault(); evt.stopPropagation(); }

  // Hard debounce: ignore anything within 350ms of last tap
  var now = Date.now();
  if (now - lastTap < 350) return;
  lastTap = now;

  // Ripple
  if (evt && evt.target) {
    var btn = evt.target;
    var rect = btn.getBoundingClientRect();
    var r = document.createElement('span');
    r.className = 'ripple';
    var size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    var x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left - size/2;
    var y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top - size/2;
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    btn.appendChild(r);
    setTimeout(function(){ r.remove(); }, 400);
  }

  if (key === 'del') {
    typed = typed.slice(0, -1);
  } else if (key === 'ok') {
    if (typed.length > 0) {
      post({ type: 'answer', value: parseInt(typed, 10) });
      typed = '';
    }
  } else {
    if (typed.length < 3) typed += key;
  }
  render();
}

function render() {
  var el = document.getElementById('display');
  if (typed === '') { el.textContent = '—'; el.className = 'empty'; }
  else              { el.textContent = typed; el.className = ''; }
}

function resetDrawing() { typed = ''; render(); }
window.resetDrawing = resetDrawing;

// Konfetti-Explosion
function celebrate(streak) {
  var count = streak >= 10 ? 30 : streak >= 5 ? 18 : 10;
  var colors = ['#6C3CE1','#FFD93D','#4CAF50','#FF6B6B','#FF9800','#00BCD4'];
  for (var i = 0; i < count; i++) {
    var c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.top = (Math.random() * 20 - 10) + 'vh';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = (Math.random() * 0.3) + 's';
    c.style.animationDuration = (0.6 + Math.random() * 0.6) + 's';
    c.style.width = (6 + Math.random() * 6) + 'px';
    c.style.height = (6 + Math.random() * 6) + 'px';
    document.body.appendChild(c);
    setTimeout(function(el){ el.remove(); }, 1500, c);
  }
}
window.celebrate = celebrate;

function post(d) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(d));
}

post({ type: 'modelReady' });
</script>
</body>
</html>`;

const DrawingWebView = forwardRef(function DrawingWebView(
  { onAnswer, onSkip, onModelReady, style },
  ref,
) {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset(needsTens) {
      webViewRef.current?.injectJavaScript('resetDrawing(); true;');
    },
    celebrate(streak) {
      webViewRef.current?.injectJavaScript(`celebrate(${streak || 0}); true;`);
    },
  }));

  const handleMessage = useCallback((event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === 'answer')     onAnswer?.(d.value);
      if (d.type === 'skip')       onSkip?.();
      if (d.type === 'modelReady') onModelReady?.(true);
    } catch (_) {}
  }, [onAnswer, onSkip, onModelReady]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: DRAWING_HTML }}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
      />
    </View>
  );
});

export default DrawingWebView;

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#F0F4FF' },
});
