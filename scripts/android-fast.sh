#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-Nexus5X_API_35_Lite}"

export ANDROID_SDK_ROOT
export ANDROID_HOME
export PATH="${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"

MODE="${1:-full}"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}"
    exit 1
  fi
}

has_connected_device() {
  adb devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit(found ? 0 : 1) }'
}

boot_is_completed() {
  local boot_state
  boot_state="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
  [[ "${boot_state}" == "1" ]]
}

start_emulator() {
  local avd_name="$1"
  local log_path="/tmp/android-emulator-${avd_name}.log"

  if ! emulator -list-avds | grep -Fxq "${avd_name}"; then
    echo "AVD '${avd_name}' not found. Run 'emulator -list-avds' and set ANDROID_AVD_NAME."
    exit 1
  fi

  echo "Starting emulator '${avd_name}'..."
  nohup emulator \
    -avd "${avd_name}" \
    -gpu host \
    -no-boot-anim \
    -camera-back none \
    -camera-front none \
    >"${log_path}" 2>&1 &

  echo "Emulator logs: ${log_path}"
}

wait_for_boot_complete() {
  local max_attempts=90
  local attempt=1

  echo "Waiting for Android device..."
  timeout 240s adb wait-for-device

  echo "Waiting for Android boot completion..."
  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    if boot_is_completed; then
      echo "Android boot completed."
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done

  echo "Android device detected but boot completion timed out."
  return 1
}

apply_android_performance_settings() {
  adb shell settings put global window_animation_scale 0 || true
  adb shell settings put global transition_animation_scale 0 || true
  adb shell settings put global animator_duration_scale 0 || true
}

require_command adb
require_command emulator
require_command pnpm
require_command timeout

adb start-server >/dev/null

if ! has_connected_device; then
  start_emulator "${ANDROID_AVD_NAME}"
  wait_for_boot_complete || true
else
  echo "Using existing Android device/emulator."
fi

apply_android_performance_settings

if [[ "${MODE}" == "--emulator-only" ]]; then
  echo "Emulator is ready."
  exit 0
fi

cd "${PROJECT_ROOT}"
exec pnpm --filter @velqora/mobile android
