    const SUPABASE_URL = "https://lrhppcbzghebhpgreyzt.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyaHBwY2J6Z2hlYmhwZ3JleXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjU3MzEsImV4cCI6MjA3OTY0MTczMX0.JJFH4BzuEZ5cPU6ng_vHxziAbWMxwDPLCj2sOrdCxrQ";

    const API_BASE = SUPABASE_URL + "/rest/v1/messages";
    const HEADERS = {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    const centerWrap = document.getElementById('centerVideoWrap');
    const centerVideo = document.getElementById('centerVideo');

    function applyVideoSizeByViewport() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const isMobile = vw <= 700;

      const size = isMobile ? vw : 1.25*vh;

      const clamped = Math.max(20, Math.min(size, 12000));
      centerWrap.style.width = clamped + 'px';
      centerWrap.style.height = clamped + 'px';

      centerVideo.style.width = '100%';
      centerVideo.style.height = '100%';
    }

    window.addEventListener('resize', applyVideoSizeByViewport);
    window.addEventListener('orientationchange', applyVideoSizeByViewport);
    applyVideoSizeByViewport();

    (function tryAutoPlayOnLoad() {
      centerVideo.muted = true;
      const p = centerVideo.play();
      if (p && p.catch) p.catch(err => console.warn("Autoplay blocked:", err));
    })();

    const sky = document.getElementById('sky');
    const regenBtn = document.getElementById('regen');
    const refetchBtn = document.getElementById('refetch');
    const countInput = document.getElementById('count');

    let wishes = [];
    let total = 0;
    let remaining = 0;

    async function loadWishesFromDB(){
      try {
        const url = API_BASE + "?select=name,course,message,created_at&order=created_at.desc";
        const r = await fetch(url, { headers: HEADERS });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error("API error: " + txt);
        }
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error("Invalid data from API");
        wishes = data.map(d => ({
          name: d.name ,
          course: d.course,
          message: d.message,
          created_at: d.created_at || null,
          popped: false
        }));
        shuffleArray(wishes);
        total = wishes.length;
        remaining = total;
        countInput.value = total;
        return wishes;
      } catch (err) {
        console.error("Failed to load wishes:", err);
        wishes = [];
        total = 0;
        remaining = 0;
        countInput.value = 0;
        return [];
      }
    }

    function shuffleArray(a){
      for(let i=a.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [a[i], a[j]] = [a[j], a[i]];
      }
    }

    function randomRange(min,max){ return Math.random()*(max-min)+min; }

    function createBubbleWithWish(idx) {
      if (idx >= 0 && wishes[idx] && wishes[idx].popped) return null;
      if (document.querySelector(`.bubble[data-wish-index="${idx}"]`)) return null;

      const b = document.createElement('div');
      b.className = 'bubble';

      const size = Math.round(randomRange(72, 150));
      b.style.width = size + 'px';
      b.style.height = size + 'px';

      const vw = window.innerWidth;
      const wrapRect = centerWrap.getBoundingClientRect();
      const wrapWidthVW = (wrapRect.width / vw) * 100; 
      const avoidLeft = 50 - wrapWidthVW/2 - 6; 
      const avoidRight = 50 + wrapWidthVW/2 + 6;

      let leftCandidate = randomRange(3, 96);
      if (leftCandidate > avoidLeft && leftCandidate < avoidRight) {
        leftCandidate = leftCandidate < 50 ? leftCandidate - randomRange(12,18) : leftCandidate + randomRange(12,18);
      }
      b.style.left = Math.min(Math.max(leftCandidate, 2), 96) + 'vw';

      const sway = (randomRange(-8,8)) + 'vw';
      b.style.setProperty('--sway', sway);

      const s = (randomRange(50,100)/100).toFixed(2);
      b.style.setProperty('--s', s);

      const duration = Math.round(randomRange(9000, 18000));
      const delay = Math.round(randomRange(1000, 2200));
      b.style.animation = `rise ${duration}ms linear ${delay}ms forwards`;

      b.style.opacity = 1;

      b.dataset.wishIndex = idx;

      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        popBubble(b);
      }, {passive:true});

      b.addEventListener('animationend', () => {
        if (b.parentElement) b.parentElement.removeChild(b);
        if (idx >= 0 && wishes[idx] && !wishes[idx].popped) {
          const delayRecreate = Math.round(randomRange(300, 1200));
          setTimeout(() => {
            if (!document.querySelector(`.bubble[data-wish-index="${idx}"]`)) {
              createBubbleWithWish(idx);
            }
          }, delayRecreate);
        }
      });

      sky.appendChild(b);
      return b;
    }

    function spawnAllWishes() {
      document.querySelectorAll('.bubble').forEach(el=>el.remove());
      remaining = total;
      for (let i = 0; i < total; i++) {
        setTimeout(() => {
          createBubbleWithWish(i);
        }, Math.random() * 600);
      }
    }

    async function popBubble(b){
      if (!b || b.classList.contains('pop')) return;
      b.classList.add('pop');

      const idx = Number(b.dataset.wishIndex);
      const wish = wishes[idx] || { message: 'Không có lời chúc', name:'', course:'' };

      const closedPromise = showWishPopup(wish);

      if (idx >= 0 && wishes[idx]) {
        wishes[idx].popped = true;
      }

      remaining--;
      setTimeout(()=>{ if (b.parentElement) b.parentElement.removeChild(b); }, 260);

      if (remaining <= 0) {
        try {
          await closedPromise;
        } catch(e) {
          console.warn("waiting for popup close failed:", e);
        }
        showFinishPopup();
      }
    }

     function showWishPopup(wish){
      return new Promise((resolve) => {
        const isImageUrl = (s) => {
          if (!s) return false;
          s = String(s).trim();
          return /^data:image\/.+;base64,/.test(s) ||
                 /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s);
        };

        const wrap = document.createElement('div');
        wrap.className = 'popup-mask';
        wrap.style.opacity = '0';
        wrap.style.transition = 'opacity 180ms ease';

        const box = document.createElement('div');
        box.className = 'popup-box';

        const title = document.createElement('div');
        title.className = 'popup-title';

        const wishDiv = document.createElement('div');
        wishDiv.className = 'popup-wish';

        const msg = (wish && wish.message) ? String(wish.message).trim() : '';

        if (isImageUrl(msg)) {
          const img = document.createElement('img');
          img.src = msg;
          img.alt = 'Ảnh lời chúc';
          img.loading = 'lazy';
          img.style.maxWidth = '80vw';
          img.style.maxHeight = '60vh';
          img.style.borderRadius = '10px';
          img.style.display = 'block';
          img.style.margin = '0 auto';
          wishDiv.appendChild(img);
        } else {
           wishDiv.textContent = msg;
        }

        const meta = document.createElement('div');
        meta.className = 'popup-meta';
        meta.textContent = (wish && wish.name ? wish.name : '') + (wish && wish.course ? ' — ' + wish.course : '');

        const close = document.createElement('button');
        close.className = 'popup-close';
        close.textContent = 'Xem tiếp';
        close.onclick = () => {
          wrap.style.opacity = '0';
          setTimeout(()=> {
            try { wrap.remove(); } catch(e){}
            resolve();
          }, 180);
        };

        box.appendChild(title);
        box.appendChild(wishDiv);
        box.appendChild(meta);
        box.appendChild(close);
        wrap.appendChild(box);
        document.body.appendChild(wrap);
        requestAnimationFrame(()=> wrap.style.opacity = '1');

      });
    }

    function showFinishPopup(){
      const wrap = document.createElement('div');
      wrap.className = 'popup-mask';
      const box = document.createElement('div');
      box.className = 'popup-box';
      box.innerHTML = `<div style="margin-top:8px">Chúc các anh chị thuận buồm xuôi gió và thành công rực rỡ!</div>`;
      const btn = document.createElement('button');
      btn.className = 'popup-close';
      btn.textContent = 'Nhìn lại thêm lần nữa';
      btn.onclick = () => {
        wrap.remove();
        wishes.forEach(w => { if (w) w.popped = false; });
        spawnAllWishes();
      };
      box.appendChild(btn);
      wrap.appendChild(box);
      document.body.appendChild(wrap);
    }

    regenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (total <= 0) { alert("Không có lời chúc để tạo bong bóng."); return; }
      wishes.forEach(w => { if (w) w.popped = false; });
      shuffleArray(wishes);
      spawnAllWishes();
    });

    refetchBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await loadWishesFromDB();
      if (total > 0) spawnAllWishes();
    });

    (async function init(){
      await loadWishesFromDB();
      if (total <= 0) {
        countInput.value = 0;
        const b = createBubbleWithWish(-1);
        if (b) {
          b.style.width = '90px';
          b.style.height = '90px';
          b.addEventListener('pointerdown', ()=> {
            showWishPopup({ message: 'Chưa có lời chúc trong cơ sở dữ liệu. Vui lòng thêm lời chúc trong bảng "messages".', name:'Hệ thống', course:'' });
            b.classList.add('pop'); setTimeout(()=>b.remove(),260);
          }, {passive:true});
        }
        return;
      }
      spawnAllWishes();
    })();