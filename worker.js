const EXTRA = [2, 5, 3, 8, 8, 8, 18, 4, 11, 6, 2], ports = new Map(), F = []
let W = 0, H = 0, D = 0, last = performance.now()
const R = Math.random, clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const live = () => [...ports.values()].filter(p => p.r && last - p.t < 3000)
const sc = z => W / (W + z)
const px = f => [W / 2 + (f.x - W / 2) * sc(f.z), H / 2 + (f.y - H / 2) * sc(f.z)]

function target(f) {
  const v = live(), r = v.length && R() < .8 ? v[R() * v.length | 0].r : [0, 0, W, H]
  f.tz = D * (f.sp == 9 ? .5 + R() * .45 : .05 + R() * .9)
  const s = sc(f.tz)
  f.tx = clamp(W / 2 + (r[0] + R() * r[2] - W / 2) / s, 80, W - 80)
  f.ty = clamp(H / 2 + (r[1] + R() * r[3] - H / 2) / s, H * .12, H * .8)
  f.tt = 4 + R() * 8
}

function tick() {
  const now = performance.now(), dt = Math.min(.05, (now - last) / 1000)
  last = now
  const v = live()
  if (!v.length) return
  for (const f of F) {
    f.tt -= dt
    let dx = f.tx - f.x, dy = f.ty - f.y, dz = f.tz - f.z, d = Math.hypot(dx, dy, dz) || 1
    if (d < 60 || f.tt < 0) target(f)
    dx /= d, dy /= d, dz /= d
    for (const o of F) {
      const ex = f.x - o.x, ey = f.y - o.y, ez = f.z - o.z, e = Math.hypot(ex, ey, ez)
      if (e > 0 && e < 130) { const k = (130 - e) / 130 * 2 / e; dx += ex * k, dy += ey * k, dz += ez * k }
    }
    const [sx, sy] = px(f), s = sc(f.z)
    for (const p of v) if (p.m) {
      const ex = sx - p.m[0], ey = sy - p.m[1], e = Math.hypot(ex, ey) || 1, rad = 140 * s + 40
      if (e < rad) { const k = (rad - e) / rad * 6 / e; dx += ex * k, dy += ey * k, dz += (rad - e) / rad * 3, f.panic = Math.max(f.panic, .4) }
    }
    f.panic = Math.max(0, f.panic - dt)
    const turn = (f.panic ? 7 : 1.6) * dt, wp = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -.6, .6)
    let a = Math.atan2(dz, dx) - f.yaw
    a = Math.atan2(Math.sin(a), Math.cos(a))
    f.yaw += clamp(a, -turn, turn)
    f.pitch += clamp(wp - f.pitch, -turn * .6, turn * .6)
    f.ph += dt * (3 + f.v / 25)
    const want = f.panic ? 140 + 420 * Math.min(1, f.panic) : f.k * (45 + 35 * Math.max(0, Math.sin(f.ph * .35 + f.k * 9))) * (Math.abs(a) > 1.2 ? .5 : 1)
    f.v += (want - f.v) * Math.min(1, dt * (f.panic ? 8 : 1.5))
    const cp = Math.cos(f.pitch)
    f.x = clamp(f.x + Math.cos(f.yaw) * cp * f.v * dt, 40, W - 40)
    f.y = clamp(f.y + Math.sin(f.pitch) * f.v * dt, H * .08, H * .84)
    f.z = clamp(f.z + Math.sin(f.yaw) * cp * f.v * dt, 20, D - 20)
  }
  const out = []
  for (const f of F) out.push(f.x, f.y, f.z, f.yaw, f.pitch, f.ph, f.sp)
  for (const [port, p] of ports) if (last - p.t < 3000) port.postMessage({ W, H, f: out })
}

onconnect = e => {
  const port = e.ports[0], p = { t: 0 }
  ports.set(port, p)
  port.onmessage = ({ data: d }) => {
    p.t = performance.now()
    if (d.bye) ports.delete(port)
    if (d.r) p.r = d.r, W = Math.max(W, d.s[0]), H = Math.max(H, d.s[1]), D = W * .5
    if ('m' in d) p.m = d.m
    if (d.c) for (const f of F) {
      const [sx, sy] = px(f), ex = sx - d.c[0], ey = sy - d.c[1], e = Math.hypot(ex, ey) || 1
      if (e < 260 * sc(f.z) + 60) {
        f.panic = 1.6
        f.tx = clamp(f.x + ex / e * 600, 80, W - 80)
        f.ty = clamp(f.y + ey / e * 300, H * .12, H * .8)
        f.tz = clamp(f.z + D * .4, 20, D - 20)
        f.tt = 5
      }
    }
    if (!F.length && W) for (let i = 0; i < 19 + EXTRA.length; i++) {
      const f = { x: R() * W, y: H * (.15 + R() * .6), z: R() * D, yaw: R() * 6.28, pitch: 0, v: 40, ph: R() * 6, panic: 0, k: .7 + R() * .6, sp: i < 19 ? i : EXTRA[i - 19] }
      target(f)
      F.push(f)
    }
  }
}

setInterval(tick, 16)
