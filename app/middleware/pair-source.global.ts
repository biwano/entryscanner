export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.client) {
    // When navigating to a pair analysis page from a non-pair analysis page
    if (to.path.startsWith("/pair/") && !from.path.startsWith("/pair/")) {
      // Only store if we actually have a previous route name (it's not initial load)
      if (from.name) {
        localStorage.setItem("pair_analysis_source", from.fullPath);
      } else if (!localStorage.getItem("pair_analysis_source")) {
        // Fallback for direct entry if nothing is stored
        localStorage.setItem("pair_analysis_source", "/");
      }
    }
  }
});
