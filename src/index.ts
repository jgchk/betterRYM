if (location.pathname.startsWith('/release/')) {
  void import('./find-stream-links')
} else if (location.pathname.startsWith('/releases/ac')) {
  void import('./release-submission')
} else if (location.pathname.startsWith('/images/upload')) {
  void import('./cover-art')
} else if (location.pathname.startsWith('/submit_media_link')) {
  void import('./submit-stream-links')
} else if (location.pathname.startsWith('/collection')) {
  void import('./filter-collection')
}
