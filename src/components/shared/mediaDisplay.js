/** @typedef {'compact' | 'default' | 'large'} PosterSize */
/** @typedef {{ hidePosters?: boolean, posterSize?: PosterSize }} PosterDisplayPreferences */

const posterCardMinWidths = {
  compact: '9rem',
  default: '11rem',
  large: '14rem',
};

const compactCardMinWidths = {
  compact: '16rem',
  default: '20rem',
  large: '24rem',
};

const compactDensityLabels = {
  compact: 'Dense',
  default: 'Comfortable',
  large: 'Spacious',
};

const posterSizeLabels = {
  compact: 'Compact',
  default: 'Default',
  large: 'Large',
};

/**
 * @param {PosterDisplayPreferences} [posterDisplayPreferences]
 */
export function getMediaGridClassName(posterDisplayPreferences = {}) {
  if (posterDisplayPreferences.hidePosters) {
    return 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(var(--compact-card-min,20rem),1fr))]';
  }

  return 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(var(--poster-card-min,11rem),1fr))]';
}

/**
 * @param {PosterDisplayPreferences} [posterDisplayPreferences]
 * @returns {{ '--compact-card-min'?: string, '--poster-card-min'?: string }}
 */
export function getMediaGridStyle(posterDisplayPreferences = {}) {
  const posterSize = posterDisplayPreferences.posterSize || 'default';

  if (posterDisplayPreferences.hidePosters) {
    return {
      '--compact-card-min': compactCardMinWidths[posterSize] || compactCardMinWidths.default,
    };
  }

  return {
    '--poster-card-min': posterCardMinWidths[posterSize] || posterCardMinWidths.default,
  };
}

/**
 * @param {PosterDisplayPreferences} [posterDisplayPreferences]
 */
export function getPosterDensityLabel(posterDisplayPreferences = {}) {
  return posterDisplayPreferences.hidePosters ? 'Density' : 'Poster size';
}

/**
 * @param {PosterDisplayPreferences} [posterDisplayPreferences]
 * @returns {string[]}
 */
export function getPosterDensityOptions(posterDisplayPreferences = {}) {
  const labels = posterDisplayPreferences.hidePosters ? compactDensityLabels : posterSizeLabels;
  return ['compact', 'default', 'large'].map((value) => labels[value]);
}
