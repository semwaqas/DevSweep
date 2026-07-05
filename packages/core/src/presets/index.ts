export const scanPresets = {
  safe: ["next_builds", "build_folders", "turbo_cache", "npm_cache_clean", "pnpm_store_prune", "cursor_cache"],
  advanced: ["xcode_derived_data", "docker_prune_without_volumes", "user_cache"],
  neverDefault: ["xcode_archives", "ios_simulator_devices", "docker_prune_with_volumes"]
};
