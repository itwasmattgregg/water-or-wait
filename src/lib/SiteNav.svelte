<script lang="ts">
  import BrandMark from './BrandMark.svelte'
  import { hrefFor, linkClick, router, type Route } from './router.svelte'

  interface Props {
    variant?: 'hero' | 'solid'
  }
  let { variant = 'solid' }: Props = $props()

  const links: { route: Route; label: string }[] = [
    { route: 'science', label: 'The science' },
    { route: 'sources', label: 'Sources' },
    { route: 'check', label: 'Check yard' },
  ]
</script>

<header class="nav" class:hero={variant === 'hero'} class:solid={variant === 'solid'}>
  <a
    class="home"
    href={hrefFor('home')}
    aria-label="Water or Wait home"
    onclick={(e) => linkClick(e, 'home')}
  >
    <BrandMark size="sm" light={variant === 'hero'} />
  </a>
  <nav aria-label="Primary">
    {#each links as link}
      <a
        href={hrefFor(link.route)}
        class:active={router.route === link.route}
        class:cta={link.route === 'check'}
        onclick={(e) => linkClick(e, link.route)}
      >
        {link.label}
      </a>
    {/each}
  </nav>
</header>

<style>
  .nav {
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    padding: 0.85rem 1rem;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .nav.hero {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
  }

  .nav.solid {
    position: sticky;
    top: 0;
    background: color-mix(in srgb, var(--paper) 90%, white);
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 10%, transparent);
    backdrop-filter: blur(10px);
  }

  .home {
    min-width: 0;
    flex: 1 1 auto;
    text-decoration: none;
    color: inherit;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem 0.45rem;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
  }

  nav a {
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 550;
    padding: 0.4rem 0.65rem;
    border-radius: 999px;
    color: var(--ink-soft);
    white-space: nowrap;
  }

  .hero nav a {
    color: color-mix(in srgb, var(--cream) 88%, transparent);
  }

  nav a:hover,
  nav a.active {
    color: var(--ink);
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }

  .hero nav a:hover,
  .hero nav a.active {
    color: var(--cream);
    background: color-mix(in srgb, var(--cream) 14%, transparent);
  }

  nav a.cta {
    background: var(--amber);
    color: #1d1408;
  }

  .hero nav a.cta {
    background: var(--amber);
    color: #1d1408;
  }

  nav a.cta:hover,
  .hero nav a.cta:hover {
    filter: brightness(1.05);
    color: #1d1408;
  }

  @media (max-width: 560px) {
    nav a:not(.cta):not(.active) {
      display: none;
    }
  }
</style>
