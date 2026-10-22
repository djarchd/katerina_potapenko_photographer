'use strict';

/* ===== НАЛАШТУВАННЯ ===== */
const CONTACT_EMAIL = 'you@example.com';   // куди надходять заявки з форми

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== 1. МОБІЛЬНЕ МЕНЮ (бургер) ===== */
function initMobileMenu() {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (!burger || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('nav--open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  };

  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('.nav__link')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.matchMedia('(min-width: 48em)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

/* ===== 2. ПЛАВНА ПРОКРУТКА ПО ЯКОРЯХ ===== */
function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', `#${id}`);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

/* ===== 3. ФІЛЬТР ПОРТФОЛІО ===== */
function initPortfolioFilter() {
  const buttons = document.querySelectorAll('.filters__btn');
  const items = document.querySelectorAll('.gallery__item');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('filters__btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      items.forEach((item) => { item.hidden = !(filter === 'all' || item.dataset.category === filter); });
    });
  });
}

/* ===== 4. СЛАЙДЕР-СТРІЧКА: клонування для безшовного циклу + пауза ===== */
function initSlider() {
  const slider = document.getElementById('slider');
  const track = slider && slider.querySelector('.slider__track');
  const toggle = slider && slider.querySelector('.slider__toggle');
  if (!track) return;

  // дублюємо слайди: анімація зсуває стрічку рівно на половину довжини
  [...track.children].forEach((item, i) => {
    const clone = item.cloneNode(true);
    clone.dataset.cloneOf = i;
    clone.setAttribute('aria-hidden', 'true');
    const btn = clone.querySelector('button');
    btn.removeAttribute('data-lightbox');
    btn.tabIndex = -1;
    track.appendChild(clone);
  });

  // кнопка паузи/відтворення (доступність для рухомого контенту)
  toggle.addEventListener('click', () => {
    const paused = slider.classList.toggle('slider--paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Відновити анімацію стрічки' : 'Призупинити анімацію стрічки');
  });
}

/* ===== 5. ЛАЙТБОКС (перегортування, клавіатура, свайп) ===== */
function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const img = box.querySelector('.lightbox__img');
  const caption = box.querySelector('.lightbox__caption');
  const btnClose = box.querySelector('.lightbox__btn--close');
  const btnPrev = box.querySelector('.lightbox__btn--prev');
  const btnNext = box.querySelector('.lightbox__btn--next');

  let list = [], index = 0, opener = null, touchX = null;

  const render = (i) => {
    index = (i + list.length) % list.length;
    const el = list[index];
    const thumb = el.querySelector('img');
    img.classList.add('lightbox__img--fade');
    setTimeout(() => {
      img.src = el.dataset.full || thumb.currentSrc || thumb.src;   // data-full: шлях до великої версії фото
      img.alt = thumb.alt;
      caption.textContent = `${el.dataset.caption || thumb.alt} · ${index + 1} / ${list.length}`;
      img.classList.remove('lightbox__img--fade');
    }, prefersReducedMotion() ? 0 : 120);
  };

  const open = (trigger) => {
    // перегортуємо лише видимі фото тієї ж галереї (з урахуванням фільтра)
    list = [...document.querySelectorAll(`[data-lightbox][data-gallery="${trigger.dataset.gallery}"]`)]
      .filter((el) => !el.closest('[hidden]'));
    opener = trigger;
    box.hidden = false;
    document.body.classList.add('is-locked');
    render(list.indexOf(trigger));
    btnClose.focus();
  };

  const close = () => {
    box.hidden = true;
    document.body.classList.remove('is-locked');
    if (opener) opener.focus();
  };

  document.addEventListener('click', (e) => {
    let trigger = e.target.closest('[data-lightbox]');
    const clone = e.target.closest('[data-clone-of]');   // клік по клону в слайдері відкриває оригінал
    if (clone) trigger = document.querySelector(`[data-lightbox][data-slide="${clone.dataset.cloneOf}"]`);
    if (trigger) open(trigger);
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => render(index - 1));
  btnNext.addEventListener('click', () => render(index + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') render(index - 1);
    else if (e.key === 'ArrowRight') render(index + 1);
    else if (e.key === 'Tab') {                       // фокус не виходить за межі модального вікна
      const f = [btnClose, btnPrev, btnNext];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  box.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) render(index + (dx < 0 ? 1 : -1));
  });
}

/* ===== 6. ФОРМА ЗАЯВКИ (відкриває поштовий клієнт) ===== */
function initContactForm() {
  const form = document.getElementById('request-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const d = new FormData(form);
    const body = `Ім’я: ${d.get('name')}\nКонтакт: ${d.get('contact')}\nТип: ${d.get('type')}\n\n${d.get('msg')}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Заявка на зйомку')}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Відкриваємо поштовий клієнт для надсилання заявки.';
  });
}

/* ===== ЗАПУСК ===== */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSmoothScroll();
  initPortfolioFilter();
  initSlider();
  initLightbox();
  initContactForm();
});
