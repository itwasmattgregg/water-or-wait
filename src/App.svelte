<script lang="ts">
  import { onMount } from 'svelte'
  import { router, syncFromLocation } from './lib/router.svelte'
  import CheckPage from './pages/CheckPage.svelte'
  import HomePage from './pages/HomePage.svelte'
  import SciencePage from './pages/SciencePage.svelte'
  import SourcesPage from './pages/SourcesPage.svelte'

  onMount(() => {
    syncFromLocation()
    const onPop = () => syncFromLocation()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  })

  const titles: Record<string, string> = {
    home: 'Water or Wait — Rain is data. Soil is a ledger.',
    check: 'Check your yard — Water or Wait',
    science: 'The science — Water or Wait',
    sources: 'Sources — Water or Wait',
  }

  $effect(() => {
    document.title = titles[router.route] ?? 'Water or Wait'
  })
</script>

{#if router.route === 'home'}
  <HomePage />
{:else if router.route === 'check'}
  <CheckPage />
{:else if router.route === 'science'}
  <SciencePage />
{:else}
  <SourcesPage />
{/if}
