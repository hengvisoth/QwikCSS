<template>
  <div
    class="qwikcss-card-handle qc-flex qc-items-start qc-justify-between qc-gap-3 qc-border-b qc-border-white/10 qc-bg-white/5 qc-px-3 qc-py-2.5 qc-cursor-move"
    id="__qwikcss_hovercard_handle__"
  >
    <div
      class="qwikcss-card-crumbs qc-flex qc-flex-1 qc-min-w-0 qc-flex-col qc-gap-1"
      id="__qwikcss_card_crumbs__"
    ></div>
    <div class="qwikcss-card-actions qc-flex qc-items-center qc-gap-2">
      <button
        class="qwikcss-card-close qc-flex qc-h-7 qc-w-7 qc-items-center qc-justify-center qc-rounded-lg qc-border qc-border-white/20 qc-bg-white/10 qc-text-[16px] qc-leading-[26px] qc-text-white/90 qc-transition qc-duration-150 hover:qc-border-white/40 hover:qc-bg-white/20"
        type="button"
        title="Resume inspect"
      >
        &times;
      </button>
    </div>
  </div>
  <div class="qwikcss-card-body qc-flex qc-flex-col qc-gap-3 qc-p-3">
    <div
      class="qwikcss-card-title qc-text-[15px] qc-font-semibold qc-tracking-wide qc-text-[color:var(--qc-accent)]"
      id="__qwikcss_card_title__"
    >
      &mdash;
    </div>
    <div class="qwikcss-card-meta qc-flex qc-flex-wrap qc-gap-2">
      <div
        class="qwikcss-card-chip qc-inline-flex qc-items-center qc-gap-1.5 qc-rounded-full qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1 qc-text-[11px] qc-text-white/90"
      >
        <span
          class="chip-label qc-text-[9px] qc-uppercase qc-tracking-[0.18em] qc-text-[color:var(--qc-muted)]"
          >size</span
        >
        <span id="__qwikcss_card_size__">&mdash;</span>
      </div>
      <div
        class="qwikcss-card-chip qc-inline-flex qc-items-center qc-gap-1.5 qc-rounded-full qc-border qc-border-white/10 qc-bg-white/5 qc-px-2 qc-py-1 qc-text-[11px] qc-text-white/90"
      >
        <span
          class="chip-label qc-text-[9px] qc-uppercase qc-tracking-[0.18em] qc-text-[color:var(--qc-muted)]"
          >font</span
        >
        <span id="__qwikcss_card_font__">&mdash;</span>
      </div>
    </div>
    <div
      class="qwikcss-card-props qc-flex qc-max-h-[260px] qc-flex-col qc-gap-2 qc-overflow-y-auto qc-overflow-x-hidden qc-pr-1"
      id="__qwikcss_card_props__"
    ></div>
    <div
      class="qwikcss-card-edit qc-hidden qc-max-h-[360px] qc-flex-col qc-gap-3 qc-overflow-y-auto qc-overflow-x-hidden qc-pr-1"
      id="__qwikcss_card_edit__"
    >
      <div
        class="qwikcss-card-tabs qc-flex qc-items-center qc-gap-3 qc-border-b qc-border-white/10 qc-pb-2"
      >
        <button
          class="qwikcss-card-tab is-active qc-relative qc-border-0 qc-bg-transparent qc-pb-1.5 qc-text-[12px] qc-text-[color:var(--qc-muted)] qc-transition qc-duration-150"
          type="button"
        >
          Design
        </button>
        <button
          class="qwikcss-card-tab qc-relative qc-border-0 qc-bg-transparent qc-pb-1.5 qc-text-[12px] qc-text-[color:var(--qc-muted)] qc-transition qc-duration-150"
          type="button"
        >
          Code
        </button>
        <button
          class="qwikcss-card-tab qc-relative qc-border-0 qc-bg-transparent qc-pb-1.5 qc-text-[12px] qc-text-[color:var(--qc-muted)] qc-transition qc-duration-150"
          type="button"
        >
          HTML
        </button>
        <button
          class="qwikcss-card-tab qc-relative qc-border-0 qc-bg-transparent qc-pb-1.5 qc-text-[12px] qc-text-[color:var(--qc-muted)] qc-transition qc-duration-150"
          type="button"
        >
          Chat
          <span
            class="qwikcss-card-badge qc-ml-1.5 qc-rounded-full qc-bg-rose-500 qc-px-1.5 qc-py-0.5 qc-text-[9px] qc-font-semibold qc-uppercase qc-tracking-[0.2em] qc-text-white"
            >NEW</span
          >
        </button>
      </div>
      <button
        class="qwikcss-card-select qc-flex qc-items-center qc-justify-between qc-gap-2 qc-rounded-xl qc-border qc-border-white/15 qc-bg-white/5 qc-px-3 qc-py-2 qc-text-[12px] qc-text-white/90 qc-transition hover:qc-border-white/30 hover:qc-bg-white/10"
        type="button"
      >
        <span class="label qc-text-[11px] qc-text-[color:var(--qc-muted)]">Media:</span>
        <span class="value qc-font-semibold qc-text-[color:var(--qc-accent)]">Auto - None</span>
        <span class="chev qc-text-[11px] qc-text-[color:var(--qc-muted)]">v</span>
      </button>
      <button
        class="qwikcss-card-select qc-flex qc-items-center qc-justify-between qc-gap-2 qc-rounded-xl qc-border qc-border-white/15 qc-bg-white/5 qc-px-3 qc-py-2 qc-text-[12px] qc-text-white/90 qc-transition hover:qc-border-white/30 hover:qc-bg-white/10"
        type="button"
      >
        <span class="label qc-text-[11px] qc-text-[color:var(--qc-muted)]">State or pseudo</span>
        <span class="value accent qc-font-semibold qc-text-[color:var(--qc-accent-2)]">None</span>
        <span class="chev qc-text-[11px] qc-text-[color:var(--qc-muted)]">v</span>
      </button>
      <div
        class="qwikcss-card-geom qc-grid qc-grid-cols-3 qc-gap-2"
        id="__qwikcss_card_geom__"
      ></div>
      <div class="qwikcss-card-section-list qc-border-t qc-border-white/10">
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
          data-section="spacing"
        >
          Spacing <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
        <div class="qwikcss-card-section-panel qc-hidden qc-py-2" data-section="spacing">
          <div
            class="qwikcss-card-spacing qc-rounded-xl qc-border qc-border-white/15 qc-bg-black/40 qc-p-2.5"
            id="__qwikcss_card_spacing__"
          ></div>
        </div>
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
          data-section="typography"
        >
          Typography <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
        <div class="qwikcss-card-section-panel qc-hidden qc-py-2" data-section="typography">
          <div
            class="qwikcss-card-typography qc-flex qc-flex-col qc-gap-2"
            id="__qwikcss_card_typography__"
          ></div>
        </div>
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
          data-section="background"
        >
          Background <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
        <div class="qwikcss-card-section-panel qc-hidden qc-py-2" data-section="background">
          <div
            class="qwikcss-card-background qc-flex qc-flex-col qc-gap-2"
            id="__qwikcss_card_background__"
          ></div>
        </div>
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
        >
          Display <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
        >
          Border <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
        <button
          class="qwikcss-card-section qc-flex qc-w-full qc-items-center qc-justify-between qc-gap-2 qc-border-b qc-border-white/10 qc-bg-transparent qc-px-1 qc-py-2.5 qc-text-[12px] qc-text-emerald-200/70 qc-transition hover:qc-text-emerald-200"
          type="button"
        >
          Positioning <span class="chev qc-text-[color:var(--qc-muted)] qc-transition">></span>
        </button>
      </div>
      <div
        class="qwikcss-card-edit-actions qc-flex qc-items-center qc-justify-between qc-gap-2 qc-pt-1"
      >
        <button
          class="qwikcss-card-btn qc-rounded-lg qc-border qc-border-white/20 qc-bg-white/10 qc-px-3 qc-py-1.5 qc-text-[12px] qc-text-white/90 qc-transition hover:qc-border-white/40 hover:qc-bg-white/20 disabled:qc-cursor-not-allowed disabled:qc-opacity-50"
          type="button"
          data-action="reset-all"
        >
          Reset all
        </button>
        <span class="qwikcss-card-hint qc-text-[10px] qc-text-[color:var(--qc-muted)]"
          >Close edit to resume inspect</span
        >
      </div>
    </div>
  </div>
</template>
