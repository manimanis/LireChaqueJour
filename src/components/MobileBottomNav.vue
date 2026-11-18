<template>
  <nav
    class="d-md-none fixed-bottom bg-body-tertiary border-top mobile-bottom-nav"
    aria-label="Navigation mobile"
  >
    <div class="nav nav-justified">
      <RouterLink class="nav-link" active-class="active" to="/">
        <i class="bi bi-house fs-5"></i>
        <span>Accueil</span>
      </RouterLink>
      <RouterLink class="nav-link" active-class="active" to="/today">
        <i class="bi bi-sun fs-5"></i>
        <span>Aujourd'hui</span>
      </RouterLink>
      <RouterLink class="nav-link" active-class="active" to="/library">
        <i class="bi bi-collection fs-5"></i>
        <span>Biblio</span>
      </RouterLink>
      <RouterLink class="nav-link" active-class="active" to="/vocabulary">
        <i class="bi bi-journal-bookmark fs-5"></i>
        <span>Vocab</span>
      </RouterLink>
      <RouterLink class="nav-link" active-class="active" to="/stats">
        <i class="bi bi-bar-chart-line fs-5"></i>
        <span>Stats</span>
      </RouterLink>
      <RouterLink class="nav-link" active-class="active" to="/settings">
        <i class="bi bi-gear fs-5"></i>
        <span>Réglages</span>
      </RouterLink>
    </div>
  </nav>
</template>
