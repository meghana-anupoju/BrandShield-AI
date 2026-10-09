const SOURCE_TIMEOUT_MS = 6000;

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Provider returned HTTP ${response.status}`);
  }
  return response.json();
}

export async function searchBluesky(companyName, fetchImpl = fetch) {
  const query = new URLSearchParams({ q: companyName, limit: '25' });
  const payload = await fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?${query}`, fetchImpl);
  const actors = Array.isArray(payload.actors) ? payload.actors : [];

  return actors.map((actor) => ({
    id: `bluesky-${actor.did}`,
    platform: 'Bluesky',
    displayName: actor.displayName || actor.handle,
    username: actor.handle,
    profileUrl: `https://bsky.app/profile/${encodeURIComponent(actor.handle)}`,
    bio: actor.description || '',
    accountCreatedDate: actor.createdAt,
    followerCount: actor.followersCount,
    verified: Boolean(actor.verification?.verifiedStatus === 'valid'),
    source: 'Bluesky public API',
    lastChecked: new Date().toISOString(),
  }));
}

export async function searchAppleAppStore(companyName, fetchImpl = fetch) {
  const query = new URLSearchParams({
    term: companyName,
    entity: 'software',
    limit: '25',
  });
  const payload = await fetchJson(`https://itunes.apple.com/search?${query}`, fetchImpl);
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results.map((app) => ({
    id: `apple-${app.trackId}`,
    appName: app.trackName || '',
    store: 'Apple App Store',
    packageId: app.bundleId,
    publisher: app.sellerName || app.artistName || 'Unknown publisher',
    storeUrl: app.trackViewUrl || '',
    description: app.description || '',
    iconRef: app.artworkUrl100,
    source: 'Apple App Store Search API',
    lastChecked: new Date().toISOString(),
  })).filter((app) => app.appName && app.storeUrl);
}

export async function collectLiveCandidates(companyName, fetchImpl = fetch) {
  const results = await Promise.allSettled([
    searchBluesky(companyName, fetchImpl),
    searchAppleAppStore(companyName, fetchImpl),
  ]);
  const [socialResult, appResult] = results;

  return {
    socialCandidates: socialResult.status === 'fulfilled' ? socialResult.value : [],
    appCandidates: appResult.status === 'fulfilled' ? appResult.value : [],
    sourceStatuses: [
      providerStatus('Bluesky public API', socialResult),
      providerStatus('Apple App Store Search API', appResult),
    ],
  };
}

function providerStatus(name, result) {
  if (result.status === 'fulfilled') {
    return {
      name,
      status: 'connected',
      detail: `${result.value.length} candidate records retrieved`,
    };
  }

  const reason = result.reason;
  const detail = reason?.name === 'TimeoutError' || reason?.name === 'AbortError'
    ? `Request timed out after ${SOURCE_TIMEOUT_MS / 1000} seconds`
    : reason instanceof Error
      ? reason.message
      : 'Provider request failed';
  return { name, status: 'unavailable', detail };
}
