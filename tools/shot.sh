#!/usr/bin/env bash
# Headless capture from the ANGAR map: places the camera at <x y z>, aims it at
# <tx ty tz> and saves a PNG. SwiftShader is required — the sandbox has no GPU.
# usage: shot.sh out.png x y z tx ty tz
set -euo pipefail

SESSION="${SESSION:-sw}"
OUT="${1:?usage: shot.sh <out.png> <x y z> <tx ty tz>}"
X="${2:-0}"; Y="${3:-2}"; Z="${4:-0}"
TX="${5:-0}"; TY="${6:-2}"; TZ="${7:-0}"

cd "$(dirname "$0")/.."

agent-browser --session "$SESSION" eval "(()=>{
  const M = window.HANGAR_MAP; if(!M) return 'not-ready';
  document.querySelector('#gate').classList.add('hide');
  const p = M.player;
  p.pos.set(($X),($Y),($Z)); p.fly = true; p.vel.set(0,0,0);
  const dx = ($TX)-($X), dy = ($TY)-($Y), dz = ($TZ)-($Z);
  p.yaw   = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx,dz));
  // Шаг с нулевым вводом: обновляет камеру, не сдвигая позицию.
  M.step(0.0001);
  return [p.pos.x.toFixed(1), p.pos.y.toFixed(1), p.pos.z.toFixed(1)].join(',');
})()"

sleep 2
RAW=$(agent-browser --session "$SESSION" screenshot 2>&1 | grep -o '/[^ ]*\.png' | tail -1)
mkdir -p "$(dirname "$OUT")"
cp "$RAW" "$OUT"
echo "$OUT"