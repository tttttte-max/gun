/* Проверка непроходимости геометрии. Скрипт выполняется в уже открытой
   странице карты (agent-browser eval) и возвращает JSON с результатами.

   Метод: игрока ставят в точку старта и «толкают» к цели фиксированными
   шагами через тот же update(), которым ходит игрок. Если траектория
   пересекла стену и игрок оказался по другую её сторону — тест провален. */
export const SCRIPT = `(() => {
  const M = window.HANGAR_MAP;
  if(!M) return JSON.stringify({error:'map not ready'});
  const P = M.player, K = M.keys;
  const clearKeys = () => Object.keys(K).forEach(k => K[k] = false);

  /** Внутри ли точка какого-нибудь коллайдера (с запасом на радиус тела). */
  function inside(x,y,z,pad){
    for(const c of M.colliders){
      if(x < c.x0-pad || x > c.x1+pad) continue;
      if(z < c.z0-pad || z > c.z1+pad) continue;
      if(y < c.y0-0.02 || y > c.y1+0.02) continue;
      return c;
    }
    return null;
  }

  /** Гонит игрока из from в to; возвращает финальную позицию и путь. */
  function drive(from, to, fly, seconds){
    clearKeys();
    P.fly = fly;
    P.pos.set(from[0], from[1], from[2]);
    P.vel.set(0,0,0);
    const dx = to[0]-from[0], dy = to[1]-from[1], dz = to[2]-from[2];
    P.yaw = Math.atan2(-dx, -dz);
    P.pitch = fly ? Math.atan2(dy, Math.hypot(dx,dz)) : 0;
    P.speed = 12;
    K['KeyW'] = true;
    const dt = 1/60, steps = Math.round(seconds/dt);
    let worst = null;
    for(let i=0;i<steps;i++){
      M.step(dt);
      const c = inside(P.pos.x, P.pos.y + (fly ? -0.3 : 0.1), P.pos.z, 0.05);
      if(c) worst = {x:+P.pos.x.toFixed(2), y:+P.pos.y.toFixed(2), z:+P.pos.z.toFixed(2)};
    }
    clearKeys();
    return {end:[+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)], inSolid:worst};
  }

  const results = [];
  const add = (name, ok, detail) => results.push({name, ok, ...detail});

  /* --- 1. Сквозь наружную стену здания (полёт) --- */
  for(const [name, from, to, limit] of [
    ['fly: сквозь северный фасад', [-12, 1.6, -18], [-12, 1.6, 0], -12.6],
    ['fly: сквозь южный фасад',    [ 6, 1.6, 19],   [ 6, 1.6, 0],   12.6],
    ['fly: сквозь западный фасад', [-28, 1.6, 4],   [0, 1.6, 4],   -19.6],
    ['fly: сквозь восточный фасад',[ 28, 1.6, 4],   [0, 1.6, 4],    19.6]
  ]){
    const r = drive(from, to, true, 4.0);
    const axis = Math.abs(to[0]-from[0]) > Math.abs(to[2]-from[2]) ? 0 : 2;
    const v = r.end[axis === 0 ? 0 : 2];
    const ok = from[axis===0?0:2] < 0 ? v < limit + 0.9 : v > limit - 0.9;
    add(name, ok, {end:r.end, limit});
  }

  /* --- 2. Сквозь перекрытие 2 этажа снизу вверх --- */
  {
    const r = drive([-14, 1.2, -6], [-14, 8, -6], true, 4.0);
    add('fly: сквозь перекрытие вверх', r.end[1] < M.floors.deck - 0.2,
        {end:r.end, deck:+M.floors.deck.toFixed(2)});
  }
  /* --- 3. Сквозь перекрытие сверху вниз --- */
  {
    const r = drive([-14, M.floors.deck + 1.2, -6], [-14, 0.3, -6], true, 4.0);
    add('fly: сквозь перекрытие вниз', r.end[1] > M.floors.deck - 0.2,
        {end:r.end, deck:+M.floors.deck.toFixed(2)});
  }
  /* --- 4. Сквозь кровлю наружу --- */
  {
    const r = drive([-24, 6, -6], [-24, 20, -6], true, 5.0);
    add('fly: сквозь кровлю', r.end[1] < M.bounds.ridge + 0.5, {end:r.end});
  }
  /* --- 5. Сквозь машину в гараже --- */
  {
    const r = drive([22, 1.2, -21.2], [34, 1.2, -21.2], true, 4.0);
    add('fly: сквозь машины гаража', r.end[0] < 33, {end:r.end});
  }
  /* --- 6. Сквозь вертолёт --- */
  {
    const r = drive([-34, 1.4, 19.2], [-20, 1.4, 19.2], true, 4.0);
    add('fly: сквозь вертолёт', r.end[0] < -21.5, {end:r.end});
  }
  /* --- 7. Сквозь контейнеры в центре --- */
  {
    const r = drive([-12, 1.3, 0], [12, 1.3, 0], true, 5.0);
    add('fly: сквозь контейнеры', r.end[0] < 11, {end:r.end});
  }
  /* --- 8. Пешком сквозь стену --- */
  {
    const r = drive([-12, 0.05, -18], [-12, 0.05, 0], false, 5.0);
    // Стена на z=-12; тело радиусом 0.34 останавливается около -12.4.
    add('walk: сквозь северный фасад', r.end[2] < -11.9, {end:r.end});
  }
  /* --- 9. Пешком по наружной лестнице на 2 этаж --- */
  {
    // Марш северной двери уходит от фасада на север: заходим с нижнего конца
    // и поднимаемся в сторону здания (+z).
    clearKeys();
    P.fly = false; P.pos.set(-10.0, 0.05, -21.6); P.vel.set(0,0,0);
    // Та же конвенция курса, что в drive(): yaw = atan2(-dx, -dz).
    P.yaw = Math.atan2(0, -(-12.0 - -21.6)); P.pitch = 0;
    P.speed = 6; K['KeyW'] = true;
    let peak = 0;
    for(let i=0;i<700;i++){ M.step(1/60); peak = Math.max(peak, P.pos.y); }
    clearKeys();
    add('walk: наружная лестница поднимает', peak > 2.8,
        {peak:+peak.toFixed(2), end:[+P.pos.x.toFixed(2),+P.pos.y.toFixed(2),+P.pos.z.toFixed(2)]});
  }
  /* --- 10. Проход в дверь: тело пролезает в проём 1.02 м --- */
  {
    // северный фасад 1 этажа: дверь D(4) шириной 1.02 от BX0=-19 → центр x=-14.5
    const r = drive([-14.5, 1.0, -14.5], [-14.5, 1.0, -8], true, 3.0);
    add('fly: пролёт в дверной проём', r.end[2] > -11.0, {end:r.end});
  }
  /* --- 11. Игрок нигде не оказался внутри геометрии --- */
  {
    const stuck = results.filter(r => r.inSolid).length;
    add('нет застреваний в геометрии', stuck === 0, {stuck});
  }

  return JSON.stringify({
    passed: results.filter(r=>r.ok).length,
    failed: results.filter(r=>!r.ok).length,
    results
  }, null, 1);
})()`;

if(process.argv[1] && process.argv[1].endsWith('collision-test.mjs')) process.stdout.write(SCRIPT);